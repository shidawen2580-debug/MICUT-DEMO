import { toProjectDetail, type ProjectDetail } from "../../domain/projects/project.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import type { ProjectRepository } from "../../domain/projects/project-repository.js";
import { err, ok, type Result } from "../../shared/result.js";

export type GetProjectError = "PROJECT_NOT_FOUND";

export interface GetProjectDependencies {
  projectRepository: ProjectRepository;
  markerRepository: MarkerRepository;
}

export async function getProject(
  { projectRepository, markerRepository }: GetProjectDependencies,
  projectId: string,
): Promise<Result<ProjectDetail, GetProjectError>> {
  const project = await projectRepository.getById(projectId);
  if (!project) {
    return err("PROJECT_NOT_FOUND");
  }

  const markerCount = await markerRepository.countByProjectId(project.id);
  return ok(toProjectDetail(project, markerCount));
}
