import type { ClipRuleRepository } from "../../domain/clip-rules/clip-rule-repository.js";
import { createDefaultClipRule } from "../../domain/clip-rules/clip-rule.js";
import type { ClipRunner } from "../../domain/clip-tasks/clip-runner.js";
import type { ClipTaskRepository } from "../../domain/clip-tasks/clip-task-repository.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import type { ProjectRepository } from "../../domain/projects/project-repository.js";
import { err, ok, type Result } from "../../shared/result.js";

export type RunClipTaskError = "TASK_NOT_FOUND" | "PROJECT_NOT_FOUND" | "PROJECT_VIDEO_MISSING";

export interface RunClipTaskDependencies {
  clipTaskRepository: ClipTaskRepository;
  projectRepository: ProjectRepository;
  markerRepository: MarkerRepository;
  clipRuleRepository: ClipRuleRepository;
  clipRunner: ClipRunner;
}

export async function runClipTask(
  { clipTaskRepository, projectRepository, markerRepository, clipRuleRepository, clipRunner }: RunClipTaskDependencies,
  taskId: string,
): Promise<Result<{ taskId: string }, RunClipTaskError>> {
  const task = await clipTaskRepository.getById(taskId);
  if (!task) {
    return err("TASK_NOT_FOUND");
  }

  const project = await projectRepository.getById(task.projectId);
  if (!project) {
    return err("PROJECT_NOT_FOUND");
  }

  if (!project.videoPath) {
    return err("PROJECT_VIDEO_MISSING");
  }

  const markers = await markerRepository.listByProjectId(project.id);
  const rule = (await clipRuleRepository.getByProjectId(project.id)) ?? createDefaultClipRule(project.id);
  await clipRunner.run({ task, project, rule, markers });
  return ok({ taskId });
}
