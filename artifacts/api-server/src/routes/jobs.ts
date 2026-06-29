import { Router, Request, Response } from "express";
import { db, jobsTable, clipsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateJobBody,
  UpdateJobProgressBody,
  GetJobParams,
  DeleteJobParams,
  UpdateJobProgressParams,
  GetJobClipsParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import fs from "fs";
import path from "path";
import { jobDir } from "../lib/processor";

export const jobsRouter = Router();

function formatJob(job: typeof jobsTable.$inferSelect) {
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    progress: job.progress,
    platform: job.platform,
    clipDuration: job.clipDuration,
    autoCaptions: job.autoCaptions,
    originalFilename: job.originalFilename ?? null,
    originalDurationSeconds: job.originalDurationSeconds ?? null,
    fileSizeMb: job.fileSizeMb ?? null,
    estimatedSecondsRemaining: job.estimatedSecondsRemaining ?? null,
    errorMessage: job.errorMessage ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function formatClip(clip: typeof clipsTable.$inferSelect) {
  return {
    id: clip.id,
    jobId: clip.jobId,
    name: clip.name,
    durationSeconds: clip.durationSeconds,
    startTimeSeconds: clip.startTimeSeconds,
    platform: clip.platform,
    sceneLabel: clip.sceneLabel ?? null,
    downloadUrl: clip.downloadUrl ?? null,
    thumbnailUrl: clip.thumbnailUrl ?? null,
    viralScore: clip.viralScore ?? null,
    createdAt: clip.createdAt.toISOString(),
  };
}

// GET /jobs
jobsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const jobs = await db
      .select()
      .from(jobsTable)
      .orderBy(sql`${jobsTable.createdAt} DESC`);
    res.json(jobs.map(formatJob));
  } catch (err) {
    req.log.error({ err }, "Failed to list jobs");
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

// POST /jobs — used for testing / dashboard only (no file)
jobsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const data = parsed.data;
    const [job] = await db
      .insert(jobsTable)
      .values({
        title: data.title,
        platform: data.platform,
        clipDuration: data.clipDuration,
        autoCaptions: data.autoCaptions,
        originalFilename: data.originalFilename ?? null,
        originalDurationSeconds: data.originalDurationSeconds ?? null,
        fileSizeMb: data.fileSizeMb ?? null,
        status: "pending",
        progress: 0,
      })
      .returning();

    res.status(201).json(formatJob(job));
  } catch (err) {
    req.log.error({ err }, "Failed to create job");
    res.status(500).json({ error: "Failed to create job" });
  }
});

// GET /jobs/:id
jobsRouter.get("/:id", async (req: Request, res: Response) => {
  const parsed = GetJobParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }
  try {
    const [job] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, parsed.data.id));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(formatJob(job));
  } catch (err) {
    req.log.error({ err }, "Failed to get job");
    res.status(500).json({ error: "Failed to get job" });
  }
});

// DELETE /jobs/:id
jobsRouter.delete("/:id", async (req: Request, res: Response) => {
  const parsed = DeleteJobParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }
  try {
    const [job] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, parsed.data.id));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    // Clean up files
    const dir = jobDir(parsed.data.id);
    await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});

    await db.delete(clipsTable).where(eq(clipsTable.jobId, parsed.data.id));
    await db.delete(jobsTable).where(eq(jobsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete job");
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// PATCH /jobs/:id/progress
jobsRouter.patch("/:id/progress", async (req: Request, res: Response) => {
  const paramsParsed = UpdateJobProgressParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = UpdateJobProgressBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updates: Partial<typeof jobsTable.$inferSelect> = {};
    const data = bodyParsed.data;
    if (data.status !== undefined) updates.status = data.status;
    if (data.progress !== undefined) updates.progress = data.progress;
    if (data.estimatedSecondsRemaining !== undefined)
      updates.estimatedSecondsRemaining = data.estimatedSecondsRemaining;
    if (data.errorMessage !== undefined) updates.errorMessage = data.errorMessage;

    const [job] = await db
      .update(jobsTable)
      .set(updates)
      .where(eq(jobsTable.id, paramsParsed.data.id))
      .returning();
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(formatJob(job));
  } catch (err) {
    req.log.error({ err }, "Failed to update job progress");
    res.status(500).json({ error: "Failed to update job" });
  }
});

// GET /jobs/:id/clips
jobsRouter.get("/:id/clips", async (req: Request, res: Response) => {
  const parsed = GetJobClipsParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid job id" });
    return;
  }
  try {
    const clips = await db
      .select()
      .from(clipsTable)
      .where(eq(clipsTable.jobId, parsed.data.id))
      .orderBy(clipsTable.startTimeSeconds);
    res.json(clips.map(formatClip));
  } catch (err) {
    req.log.error({ err }, "Failed to get job clips");
    res.status(500).json({ error: "Failed to get clips" });
  }
});
