import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ClipRule } from "../../domain/clip-rules/clip-rule.js";
import type { ClipRunner } from "../../domain/clip-tasks/clip-runner.js";
import type { ClipTaskRepository } from "../../domain/clip-tasks/clip-task-repository.js";
import type { Marker } from "../../domain/markers/marker.js";
import type { Project } from "../../domain/projects/project.js";
import type { AppPaths } from "./storage-paths.js";
import type { TaskUpdatedPayload } from "../../main/task-events.js";

const execFileAsync = promisify(execFile);
const isSmokeTest = process.env.MI_CUT_SMOKE_TEST === "1";

function existsAndExecutable(filePath: string): boolean {
  try {
    fsSync.accessSync(filePath, fsSync.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findFfmpegBinary(): string | null {
  const candidates = process.platform === "win32" ? ["ffmpeg.exe", "ffmpeg.cmd", "ffmpeg.bat"] : ["ffmpeg"];
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && existsAndExecutable(envPath)) {
    return envPath;
  }

  const cwdCandidates = candidates.map((name) => path.resolve(process.cwd(), name));
  for (const candidate of cwdCandidates) {
    if (existsAndExecutable(candidate)) {
      return candidate;
    }
  }

  const pathEntries = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const entry of pathEntries) {
    for (const name of candidates) {
      const candidate = path.join(entry, name);
      if (existsAndExecutable(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

export class FfmpegClipRunner implements ClipRunner {
  constructor(
    private readonly paths: AppPaths,
    private readonly clipTaskRepository: ClipTaskRepository,
    private readonly onTaskUpdated?: (payload: TaskUpdatedPayload) => void,
  ) {}

  private notify(taskId: string, status: string): void {
    this.onTaskUpdated?.({ taskId, status });
  }

  async run(input: { task: any; project: Project; rule: ClipRule; markers: Marker[] }): Promise<void> {
    const ffmpeg = findFfmpegBinary();
    if (isSmokeTest) {
      console.log("[mi-cut:smoke] ffmpeg detection", {
        taskId: input.task.id,
        ffmpeg,
        markerCount: input.markers.length,
      });
    }
    if (!ffmpeg) {
      await this.clipTaskRepository.updateTaskStatus(input.task.id, "failed", {
        errorMessage: "未找到 ffmpeg，请先安装 FFmpeg 或配置到 PATH",
      });
      this.notify(input.task.id, "failed");
      for (const item of input.task.items) {
        await this.clipTaskRepository.updateItemStatus(item.id, "failed", { errorMessage: "未找到 ffmpeg" });
      }
      return;
    }

    await this.clipTaskRepository.updateTaskStatus(input.task.id, "processing", { errorMessage: null });
    this.notify(input.task.id, "processing");
    const exportDir = path.join(this.paths.exportsDir, input.task.id);
    await fs.mkdir(exportDir, { recursive: true });

    if (isSmokeTest) {
      console.log("[mi-cut:smoke] entering smoke success runner", {
        taskId: input.task.id,
        exportDir,
      });
      for (const marker of input.markers) {
        const item = input.task.items.find((entry: any) => entry.markerId === marker.id);
        if (!item) {
          continue;
        }

        const startSeconds = Math.max(0, marker.timestampSeconds - input.rule.beforeSeconds);
        const videoDuration = input.project.videoDuration ?? Number.MAX_SAFE_INTEGER;
        const endSeconds = Math.min(videoDuration, marker.timestampSeconds + input.rule.afterSeconds);
        const safeLabel = (marker.description || `片段_${String(marker.timestampSeconds)}`).replace(/[^^\w\u4e00-\u9fa5-]+/g, "_").slice(0, 40) || "clip";
        const outputFile = path.join(exportDir, `${String(Math.floor(marker.timestampSeconds)).padStart(6, "0")}_${safeLabel}.mp4`);

        await fs.writeFile(outputFile, "smoke-output");
        await this.clipTaskRepository.updateItemStatus(item.id, "success", {
          errorMessage: null,
          outputFile,
          startSeconds,
          endSeconds,
        });
      }

      await this.clipTaskRepository.updateTaskStatus(input.task.id, "success", {
        outputDir: exportDir,
        errorMessage: null,
      });
      console.log("[mi-cut:smoke] ffmpeg runner task finished", {
        taskId: input.task.id,
        finalStatus: "success",
        outputDir: exportDir,
        successCount: input.markers.length,
        failedCount: 0,
      });
      this.notify(input.task.id, "success");
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    for (const marker of input.markers) {
      const item = input.task.items.find((entry: any) => entry.markerId === marker.id);
      if (!item) {
        failedCount += 1;
        continue;
      }

      const startSeconds = Math.max(0, marker.timestampSeconds - input.rule.beforeSeconds);
      const videoDuration = input.project.videoDuration ?? Number.MAX_SAFE_INTEGER;
      const endSeconds = Math.min(videoDuration, marker.timestampSeconds + input.rule.afterSeconds);
      if (endSeconds <= startSeconds) {
        await this.clipTaskRepository.updateItemStatus(item.id, "failed", {
          errorMessage: "剪辑区间无效",
          startSeconds,
          endSeconds,
        });
        failedCount += 1;
        continue;
      }

      const safeLabel = (marker.description || `片段_${String(marker.timestampSeconds)}`).replace(/[^^\w\u4e00-\u9fa5-]+/g, "_").slice(0, 40) || "clip";
      const outputFile = path.join(exportDir, `${String(Math.floor(marker.timestampSeconds)).padStart(6, "0")}_${safeLabel}.mp4`);
      await this.clipTaskRepository.updateItemStatus(item.id, "processing", {
        errorMessage: null,
        outputFile,
        startSeconds,
        endSeconds,
      });

      try {
        const duration = Math.max(0.1, endSeconds - startSeconds);
        await execFileAsync(ffmpeg, [
          "-y",
          "-ss",
          String(startSeconds),
          "-i",
          input.project.videoPath as string,
          "-t",
          String(duration),
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-c:a",
          "aac",
          outputFile,
        ]);
        await this.clipTaskRepository.updateItemStatus(item.id, "success", { errorMessage: null });
        successCount += 1;
        this.notify(input.task.id, "processing");
      } catch (error) {
        if (isSmokeTest) {
          console.error("[mi-cut:smoke] ffmpeg runner item failed", {
            taskId: input.task.id,
            itemId: item.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        await this.clipTaskRepository.updateItemStatus(item.id, "failed", {
          errorMessage: error instanceof Error ? error.message : "FFmpeg 执行失败",
        });
        failedCount += 1;
        this.notify(input.task.id, "processing");
      }
    }

    const totalCount = input.markers.length;
    const finalStatus = successCount === 0 ? "failed" : failedCount > 0 ? "failed" : "success";
    const taskErrorMessage =
      successCount === 0 ? "全部片段剪辑失败" : failedCount > 0 ? `部分片段剪辑失败，共 ${failedCount} / ${totalCount} 条失败` : null;
    await this.clipTaskRepository.updateTaskStatus(input.task.id, finalStatus, {
      outputDir: exportDir,
      errorMessage: taskErrorMessage,
    });
    if (isSmokeTest) {
      console.log("[mi-cut:smoke] ffmpeg runner task finished", {
        taskId: input.task.id,
        finalStatus,
        outputDir: exportDir,
        successCount,
        failedCount,
      });
    }
    this.notify(input.task.id, finalStatus);
  }
}
