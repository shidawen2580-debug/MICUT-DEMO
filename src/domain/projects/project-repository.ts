import type { Project } from "./project.js";

export interface ProjectVideoUpdate {
  videoPath: string;
  videoName: string;
  videoDuration: number | null;
  videoFormat: string | null;
}

export interface ProjectRepository {
  list(): Promise<Project[]>;
  getById(projectId: string): Promise<Project | null>;
  create(project: Project): Promise<void>;
  updateVideo(projectId: string, video: ProjectVideoUpdate): Promise<void>;
}
