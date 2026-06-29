import { Router, Request, Response } from "express";
import { db, clipsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetClipParams, UpdateClipBody, UpdateClipParams, DeleteClipParams } from "@workspace/api-zod";

export const clipsRouter = Router();

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

// GET /clips/:clipId
clipsRouter.get("/:clipId", async (req: Request, res: Response) => {
  const parsed = GetClipParams.safeParse({ clipId: Number(req.params.clipId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid clip id" });
    return;
  }
  try {
    const [clip] = await db
      .select()
      .from(clipsTable)
      .where(eq(clipsTable.id, parsed.data.clipId));
    if (!clip) {
      res.status(404).json({ error: "Clip not found" });
      return;
    }
    res.json(formatClip(clip));
  } catch (err) {
    res.status(500).json({ error: "Failed to get clip" });
  }
});

// PATCH /clips/:clipId
clipsRouter.patch("/:clipId", async (req: Request, res: Response) => {
  const paramsParsed = UpdateClipParams.safeParse({ clipId: Number(req.params.clipId) });
  const bodyParsed = UpdateClipBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const updates: Partial<typeof clipsTable.$inferSelect> = {};
    if (bodyParsed.data.name !== undefined) updates.name = bodyParsed.data.name;

    const [clip] = await db
      .update(clipsTable)
      .set(updates)
      .where(eq(clipsTable.id, paramsParsed.data.clipId))
      .returning();
    if (!clip) {
      res.status(404).json({ error: "Clip not found" });
      return;
    }
    res.json(formatClip(clip));
  } catch (err) {
    res.status(500).json({ error: "Failed to update clip" });
  }
});

// DELETE /clips/:clipId
clipsRouter.delete("/:clipId", async (req: Request, res: Response) => {
  const parsed = DeleteClipParams.safeParse({ clipId: Number(req.params.clipId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid clip id" });
    return;
  }
  try {
    const [clip] = await db
      .select()
      .from(clipsTable)
      .where(eq(clipsTable.id, parsed.data.clipId));
    if (!clip) {
      res.status(404).json({ error: "Clip not found" });
      return;
    }
    await db.delete(clipsTable).where(eq(clipsTable.id, parsed.data.clipId));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete clip" });
  }
});
