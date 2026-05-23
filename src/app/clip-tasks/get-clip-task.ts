import type { ClipTask, ClipTaskDetailView, ClipTaskResultItemView } from "../../domain/clip-tasks/clip-task.js";
import type { ClipTaskRepository } from "../../domain/clip-tasks/clip-task-repository.js";
import { err, ok, type Result } from "../../shared/result.js";

export type GetClipTaskError = "TASK_NOT_FOUND";

export interface GetClipTaskDependencies {
  clipTaskRepository: ClipTaskRepository;
}

function toClipTaskResultItems(task: ClipTask): ClipTaskResultItemView[] {
  return task.items.map((item, index) => ({
    id: item.id,
    name: item.outputFile ? item.outputFile.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? `片段_${String(index + 1).padStart(2, "0")}` : `片段_${String(index + 1).padStart(2, "0")}`,
    startTime: item.startSeconds,
    endTime: item.endSeconds,
    duration: Math.max(0, item.endSeconds - item.startSeconds),
    status: item.status,
    errorMessage: item.errorMessage ?? "",
  }));
}

export async function getClipTask(
  { clipTaskRepository }: GetClipTaskDependencies,
  taskId: string,
): Promise<Result<ClipTaskDetailView, GetClipTaskError>> {
  const task = await clipTaskRepository.getById(taskId);
  if (!task) {
    return err("TASK_NOT_FOUND");
  }

  return ok({
    id: task.id,
    status: task.status,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt,
    outputDir: task.outputDir,
    results: toClipTaskResultItems(task),
  });
}
