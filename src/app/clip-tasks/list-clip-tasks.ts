import type { ClipTaskSummaryView } from "../../domain/clip-tasks/clip-task.js";
import type { ClipTaskRepository } from "../../domain/clip-tasks/clip-task-repository.js";

export interface ListClipTasksDependencies {
  clipTaskRepository: ClipTaskRepository;
}

export async function listClipTasks(
  { clipTaskRepository }: ListClipTasksDependencies,
  projectId: string,
): Promise<ClipTaskSummaryView[]> {
  const tasks = await clipTaskRepository.listByProjectId(projectId);
  return tasks.map((task) => ({
    id: task.id,
    status: task.status,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt,
    outputDir: task.outputDir,
  }));
}
