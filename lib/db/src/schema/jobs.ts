import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  platform: text("platform").notNull().default("both"),
  clipDuration: integer("clip_duration").notNull().default(30),
  autoCaptions: boolean("auto_captions").notNull().default(false),
  originalFilename: text("original_filename"),
  originalDurationSeconds: integer("original_duration_seconds"),
  fileSizeMb: real("file_size_mb"),
  estimatedSecondsRemaining: integer("estimated_seconds_remaining"),
  errorMessage: text("error_message"),
  uploadedFilePath: text("uploaded_file_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
