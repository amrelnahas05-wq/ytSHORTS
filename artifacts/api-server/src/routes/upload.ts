import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, jobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processJob, uploadsDir, jobDir } from "../lib/processor";
import { logger } from "../lib/logger";

export const uploadRouter = Router();

const ACCEPTED_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/avi",
]);

const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const tmpDir = path.join(uploadsDir, "tmp");
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tmpDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Accepted: MP4, MOV, AVI, MKV, WebM`));
    }
  },
});

// POST /upload
uploadRouter.post("/", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided" });
    return;
  }

  const { title, platform, clipDuration, autoCaptions } = req.body;

  if (!title || !platform || !clipDuration) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: "Missing required fields: title, platform, clipDuration" });
    return;
  }

  const clipDurationNum = parseInt(clipDuration, 10);
  if (![15, 30, 60].includes(clipDurationNum)) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: "clipDuration must be 15, 30, or 60" });
    return;
  }

  const fileSizeMb = req.file.size / (1024 * 1024);

  try {
    const [job] = await db
      .insert(jobsTable)
      .values({
        title: title.trim(),
        platform,
        clipDuration: clipDurationNum,
        autoCaptions: autoCaptions === "true" || autoCaptions === true,
        originalFilename: req.file.originalname,
        fileSizeMb: Math.round(fileSizeMb * 10) / 10,
        status: "uploading",
        progress: 10,
      })
      .returning();

    // Move from tmp to job-specific directory
    const jobDirectory = jobDir(job.id);
    await fs.promises.mkdir(jobDirectory, { recursive: true });
    const ext = path.extname(req.file.originalname).toLowerCase() || ".mp4";
    const destPath = path.join(jobDirectory, `original${ext}`);
    await fs.promises.rename(req.file.path, destPath);

    await db
      .update(jobsTable)
      .set({ uploadedFilePath: destPath, status: "analyzing", progress: 20 })
      .where(eq(jobsTable.id, job.id));

    // Fire-and-forget real processing
    processJob(job.id, destPath).catch((err) =>
      logger.error({ err, jobId: job.id }, "Unhandled processing error")
    );

    res.status(201).json({
      id: job.id,
      title: job.title,
      status: "analyzing",
      progress: 20,
      platform: job.platform,
      clipDuration: job.clipDuration,
      autoCaptions: job.autoCaptions,
      originalFilename: job.originalFilename ?? null,
      originalDurationSeconds: null,
      fileSizeMb: job.fileSizeMb ?? null,
      estimatedSecondsRemaining: 60,
      errorMessage: null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    });
  } catch (err) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    req.log.error({ err }, "Failed to create upload job");
    res.status(500).json({ error: "Failed to start processing job" });
  }
});
