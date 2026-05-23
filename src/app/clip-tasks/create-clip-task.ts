import type { ClipRuleRepository } from "../../domain/clip-rules/clip-rule-repository.js";
import { createDefaultClipRule } from "../../domain/clip-rules/clip-rule.js";
import type { ClipTask, ClipTaskDetailView, ClipTaskItem } from "../../domain/clip-tasks/clip-task.js";
import type { ClipTaskRepository } from "../../domain/clip-tasks/clip-task-repository.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import type { ProjectRepository } from "../../domain/projects/project-repository.js";
import type { Clock } from "../../shared/clock.js";
import type { IdGenerator } from "../../shared/id-generator.js";
import { err, ok, type Result } from "../../shared/result.js";

export type CreateClipTaskError = "PROJECT_NOT_FOUND" | "PROJECT_VIDEO_MISSING" | "NO_MARKERS";

export interface CreateClipTaskDependencies {
  projectRepository: ProjectRepository;
  markerRepository: MarkerRepository;
  clipRuleRepository: ClipRuleRepository;
  clipTaskRepository: ClipTaskRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

function toPendingResult(task: ClipTask): ClipTaskDetailView {
  return {
    id: task.id,
    status: task.status,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt,
    outputDir: task.outputDir,
    results: task.items.map((item, index) => ({
      id: item.id,
      name: `片段_${String(index + 1).padStart(2, "0")}`,
      startTime: item.startSeconds,
      endTime: item.endSeconds,
      duration: Math.max(0, item.endSeconds - item.startSeconds),
      status: item.status,
      errorMessage: item.errorMessage ?? "",
    })),
  };
}

export async function createClipTask(
  { projectRepository, markerRepository, clipRuleRepository, clipTaskRepository, idGenerator, clock }: CreateClipTaskDependencies,
  projectId: string,
): Promise<Result<ClipTaskDetailView, CreateClipTaskError>> {
  const project = await projectRepository.getById(projectId);
  if (!project) {
    return err("PROJECT_NOT_FOUND");
  }

  if (!project.videoPath) {
    return err("PROJECT_VIDEO_MISSING");
  }

  const markers = await markerRepository.listByProjectId(projectId);
  if (markers.length === 0) {
    return err("NO_MARKERS");
  }

  const rule = (await clipRuleRepository.getByProjectId(projectId)) ?? createDefaultClipRule(projectId);
  const createdAt = clock.now().toISOString();
  const taskId = idGenerator.next("task");
  const items: ClipTaskItem[] = markers.map((marker) => ({
    id: idGenerator.next("task_item"),
    taskId,
    markerId: marker.id,
    startSeconds: 0,
    endSeconds: 0,
    outputFile: null,
    status: "pending",
    errorMessage: null,
  }));

  const task: ClipTask = {
    id: taskId,
    projectId,
    beforeSeconds: rule.beforeSeconds,
    afterSeconds: rule.afterSeconds,
    status: "pending",
    errorMessage: null,
    outputDir: null,
    createdAt,
    items,
  };

  await clipTaskRepository.create(task);
  return ok(toPendingResult(task));
}
