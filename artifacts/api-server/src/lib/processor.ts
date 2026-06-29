import path from "path";
import fs from "fs";
import { db, jobsTable, clipsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  getVideoMetadata,
  detectSceneCuts,
  pickCutPoints,
  extractClip,
  generateThumbnail,
} from "./ffmpeg";
import { logger } from "./logger";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

export const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");

export function jobDir(jobId: number) {
  return path.join(uploadsDir, `job_${jobId}`);
}

export function clipsDir(jobId: number) {
  return path.join(jobDir(jobId), "clips");
}

async function setJob(jobId: number, fields: Partial<typeof jobsTable.$inferSelect>) {
  await db.update(jobsTable).set(fields).where(eq(jobsTable.id, jobId));
}

const SCENE_LABELS = [
  "Opening Hook",
  "Key Insight",
  "Story Beat",
  "Call to Action",
  "Tutorial Step",
  "Highlight Moment",
  "Emotional Peak",
  "Behind the Scenes",
];

export async function processJob(jobId: number, uploadedFilePath: string): Promise<void> {
  logger.info({ jobId, uploadedFilePath }, "Starting real video processing");

  try {
    // Step 1 — Analyze
    await setJob(jobId, { status: "analyzing", progress: 5, estimatedSecondsRemaining: 60 });

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
    if (!job) throw new Error("Job not found");

    const meta = await getVideoMetadata(uploadedFilePath);
    const totalDuration = meta.durationSeconds;
    const clipDuration = job.clipDuration;

    logger.info({ jobId, totalDuration, meta }, "Got video metadata");

    await setJob(jobId, {
      originalDurationSeconds: Math.round(totalDuration),
      progress: 15,
      estimatedSecondsRemaining: 50,
    });

    // Step 2 — Scene detection
    await setJob(jobId, { status: "analyzing", progress: 25, estimatedSecondsRemaining: 40 });
    const sceneTimes = await detectSceneCuts(uploadedFilePath);
    const cutPoints = pickCutPoints(sceneTimes, totalDuration, clipDuration);

    logger.info({ jobId, sceneTimes: sceneTimes.length, cutPoints }, "Scene detection done");

    await setJob(jobId, { status: "clipping", progress: 35, estimatedSecondsRemaining: 30 });

    // Step 3 — Extract clips
    const outputClipsDir = clipsDir(jobId);
    await fs.promises.mkdir(outputClipsDir, { recursive: true });

    for (let i = 0; i < cutPoints.length; i++) {
      const startTime = cutPoints[i];
      const clipOutputPath = path.join(outputClipsDir, `clip_${i + 1}.mp4`);
      const thumbOutputPath = path.join(outputClipsDir, `clip_${i + 1}_thumb.jpg`);
      const sceneLabel = SCENE_LABELS[i % SCENE_LABELS.length];

      // Progress: 35–80% across all clips
      const clipProgressStart = 35 + Math.round((i / cutPoints.length) * 45);
      const eta = Math.round(30 - (i / cutPoints.length) * 20);

      await setJob(jobId, {
        status: "clipping",
        progress: clipProgressStart,
        estimatedSecondsRemaining: eta,
      });

      logger.info({ jobId, clip: i + 1, startTime, clipOutputPath }, "Extracting clip");

      await extractClip({
        inputPath: uploadedFilePath,
        outputPath: clipOutputPath,
        startSeconds: startTime,
        durationSeconds: Math.min(clipDuration, totalDuration - startTime),
      });

      // Step 4 — Thumbnail
      await setJob(jobId, { status: "rendering", progress: 80 + Math.round((i / cutPoints.length) * 15), estimatedSecondsRemaining: 5 });

      await generateThumbnail(clipOutputPath, thumbOutputPath, 1);

      const viralScore = Math.floor(Math.random() * 35) + 65;
      const actualDuration = Math.min(clipDuration, Math.round(totalDuration - startTime));

      const [clip] = await db
        .insert(clipsTable)
        .values({
          jobId,
          name: `${job.title} — Clip ${i + 1}`,
          durationSeconds: actualDuration,
          startTimeSeconds: Math.round(startTime),
          platform: job.platform,
          sceneLabel,
          viralScore,
          downloadUrl: `/api/media/job_${jobId}/clips/clip_${i + 1}.mp4`,
          thumbnailUrl: `/api/media/job_${jobId}/clips/clip_${i + 1}_thumb.jpg`,
        })
        .returning();

      logger.info({ jobId, clipId: clip.id }, "Clip saved");
    }

    // Done
    await setJob(jobId, {
      status: "ready",
      progress: 100,
      estimatedSecondsRemaining: 0,
    });

    logger.info({ jobId, clips: cutPoints.length }, "Processing complete");
  } catch (err) {
    logger.error({ err, jobId }, "Processing failed");
    await setJob(jobId, {
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "Unknown error during processing",
    });
  }
}
