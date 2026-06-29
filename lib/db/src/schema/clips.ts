import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { jobsTable } from "./jobs";

export const clipsTable = pgTable("clips", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  startTimeSeconds: integer("start_time_seconds").notNull(),
  platform: text("platform").notNull().default("both"),
  sceneLabel: text("scene_label"),
  downloadUrl: text("download_url"),
  thumbnailUrl: text("thumbnail_url"),
  viralScore: integer("viral_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClipSchema = createInsertSchema(clipsTable).omit({ id: true, createdAt: true });
export type InsertClip = z.infer<typeof insertClipSchema>;
export type Clip = typeof clipsTable.$inferSelect;
