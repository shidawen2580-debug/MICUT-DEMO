import type { ClipTask, ClipTaskItem, ClipTaskStatus } from "./clip-task.js";

export interface ClipTaskRepository {
  create(task: ClipTask): Promise<void>;
  getById(taskId: string): Promise<ClipTask | null>;
  listByProjectId(projectId: string): Promise<ClipTask[]>;
  updateTaskStatus(
    taskId: string,
    status: ClipTaskStatus,
    updates?: {
      errorMessage?: string | null;
      outputDir?: string | null;
    },
  ): Promise<void>;
  updateItem(item: ClipTaskItem): Promise<void>;
  updateItemStatus(
    itemId: string,
    status: ClipTaskStatus,
    updates?: {
      errorMessage?: string | null;
      outputFile?: string | null;
      startSeconds?: number;
      endSeconds?: number;
    },
  ): Promise<void>;
}
