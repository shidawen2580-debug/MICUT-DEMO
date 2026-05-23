import { toProjectSummary, type ProjectSummary } from "../../domain/projects/project.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import type { ProjectRepository } from "../../domain/projects/project-repository.js";

export interface ListProjectsDependencies {
  projectRepository: ProjectRepository;
  markerRepository: MarkerRepository;
}

export async function listProjects({ projectRepository, markerRepository }: ListProjectsDependencies): Promise<ProjectSummary[]> {
  const projects = await projectRepository.list();
  const items = await Promise.all(
    projects.map(async (project) => {
      const markerCount = await markerRepository.countByProjectId(project.id);
      return toProjectSummary(project, markerCount);
    }),
  );

  return items.sort((left, right) => right.date.localeCompare(left.date));
}
