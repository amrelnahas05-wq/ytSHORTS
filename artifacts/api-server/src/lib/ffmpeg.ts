import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
}

export async function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      const duration = metadata.format.duration ?? 0;
      const width = videoStream?.width ?? 1920;
      const height = videoStream?.height ?? 1080;
      const fpsStr = videoStream?.r_frame_rate ?? "30/1";
      const [num, den] = fpsStr.split("/").map(Number);
      const fps = den ? num / den : 30;
      resolve({ durationSeconds: duration, width, height, fps });
    });
  });
}

export async function detectSceneCuts(
  filePath: string,
  threshold = 0.3
): Promise<number[]> {
  return new Promise((resolve) => {
    const times: number[] = [0];

    ffmpeg(filePath)
      .outputOptions(["-vf", `select='gt(scene,${threshold})',showinfo`, "-vsync", "vfr", "-an"])
      .format("null")
      .output("/dev/null")
      .on("stderr", (line: string) => {
        const match = line.match(/pts_time:(\d+(?:\.\d+)?)/);
        if (match) {
          const t = parseFloat(match[1]);
          if (t > 1) times.push(t); // skip near-zero
        }
      })
      .on("end", () => resolve(times.sort((a, b) => a - b)))
      .on("error", (err) => {
        logger.warn({ err }, "Scene detection failed, falling back to even splits");
        resolve([0]);
      })
      .run();
  });
}

export interface ExtractClipOptions {
  inputPath: string;
  outputPath: string;
  startSeconds: number;
  durationSeconds: number;
  targetWidth?: number;
  targetHeight?: number;
  onProgress?: (percent: number) => void;
}

export async function extractClip(opts: ExtractClipOptions): Promise<void> {
  const { inputPath, outputPath, startSeconds, durationSeconds, onProgress } = opts;
  const targetWidth = opts.targetWidth ?? 1080;
  const targetHeight = opts.targetHeight ?? 1920;

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    // Center-crop landscape video to portrait 9:16
    // crop=ih*9/16:ih keeps center portrait slice, then scale to target
    const cropFilter = `crop=in_h*9/16:in_h,scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2`;

    ffmpeg(inputPath)
      .seekInput(startSeconds)
      .duration(durationSeconds)
      .videoFilter(cropFilter)
      .audioCodec("aac")
      .audioBitrate("128k")
      .videoCodec("libx264")
      .videoBitrate("2500k")
      .outputOptions(["-preset", "fast", "-crf", "23", "-movflags", "+faststart"])
      .output(outputPath)
      .on("progress", (progress) => {
        if (onProgress && progress.percent != null) {
          onProgress(Math.min(Math.round(progress.percent), 99));
        }
      })
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  atSecond = 1
): Promise<void> {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(atSecond)
      .frames(1)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

export function pickCutPoints(
  sceneTimes: number[],
  totalDuration: number,
  clipDuration: number
): number[] {
  // We want clips that don't overlap and fit within the video
  const maxStart = Math.max(0, totalDuration - clipDuration);
  if (maxStart <= 0) return [0];

  // Filter scene cuts that are valid start points
  const valid = sceneTimes.filter((t) => t <= maxStart);

  // We want at most 6 clips, evenly distributed if too many scenes
  const maxClips = 6;

  if (valid.length >= 2) {
    // Deduplicate scene cuts that are too close together (< clipDuration apart)
    const deduped: number[] = [valid[0]];
    for (let i = 1; i < valid.length; i++) {
      if (valid[i] - deduped[deduped.length - 1] >= clipDuration) {
        deduped.push(valid[i]);
      }
    }
    // Return up to maxClips
    return deduped.slice(0, maxClips);
  }

  // Fallback: evenly spaced cuts
  const count = Math.min(maxClips, Math.floor(totalDuration / clipDuration));
  const interval = totalDuration / count;
  return Array.from({ length: count }, (_, i) => Math.floor(i * interval));
}
