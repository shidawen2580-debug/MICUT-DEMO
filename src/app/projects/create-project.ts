import { toProjectSummary, type ProjectSummary, type Project } from "../../domain/projects/project.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import type { ProjectRepository } from "../../domain/projects/project-repository.js";
import type { Clock } from "../../shared/clock.js";
import type { IdGenerator } from "../../shared/id-generator.js";
import { err, ok, type Result } from "../../shared/result.js";

export type CreateProjectError = "PROJECT_NAME_REQUIRED";

export interface CreateProjectDependencies {
  projectRepository: ProjectRepository;
  markerRepository: MarkerRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

export async function createProject(
  { projectRepository, markerRepository, idGenerator, clock }: CreateProjectDependencies,
  name: string,
): Promise<Result<ProjectSummary, CreateProjectError>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return err("PROJECT_NAME_REQUIRED");
  }

  const project: Project = {
    id: idGenerator.next("project"),
    name: trimmedName,
    videoPath: null,
    videoName: null,
    videoDuration: null,
    videoFormat: null,
    createdAt: clock.now().toISOString(),
  };

  await projectRepository.create(project);
  const markerCount = await markerRepository.countByProjectId(project.id);
  return ok(toProjectSummary(project, markerCount));
}
