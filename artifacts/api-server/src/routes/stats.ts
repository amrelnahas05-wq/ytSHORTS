import { Router, Request, Response } from "express";
import { db, jobsTable, clipsTable } from "@workspace/db";
import { count, sql, eq } from "drizzle-orm";

export const statsRouter = Router();

// GET /stats
statsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const [jobStats] = await db
      .select({
        totalJobs: count(),
        completedJobs: sql<number>`count(*) filter (where ${jobsTable.status} = 'ready')`,
        processingJobs: sql<number>`count(*) filter (where ${jobsTable.status} not in ('ready', 'failed', 'cancelled', 'pending'))`,
        totalDurationSeconds: sql<number>`coalesce(sum(${jobsTable.originalDurationSeconds}), 0)`,
      })
      .from(jobsTable);

    const [clipStats] = await db
      .select({
        totalClips: count(),
      })
      .from(clipsTable);

    const totalJobs = Number(jobStats?.totalJobs ?? 0);
    const completedJobs = Number(jobStats?.completedJobs ?? 0);
    const processingJobs = Number(jobStats?.processingJobs ?? 0);
    const totalClipsGenerated = Number(clipStats?.totalClips ?? 0);
    const totalVideoMinutesProcessed = Number(jobStats?.totalDurationSeconds ?? 0) / 60;
    const averageClipsPerJob = completedJobs > 0 ? totalClipsGenerated / completedJobs : 0;

    res.json({
      totalJobs,
      completedJobs,
      processingJobs,
      totalClipsGenerated,
      totalVideoMinutesProcessed: Math.round(totalVideoMinutesProcessed * 10) / 10,
      averageClipsPerJob: Math.round(averageClipsPerJob * 10) / 10,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});
