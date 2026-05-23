export interface Project {
  id: string;
  name: string;
  videoPath: string | null;
  videoName: string | null;
  videoDuration: number | null;
  videoFormat: string | null;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  date: string;
  videoCount: number;
  markerCount: number;
}

export interface ProjectDetail extends ProjectSummary {
  videoPath: string | null;
  videoName: string | null;
  videoDuration: number | null;
  videoFormat: string | null;
}

export function toProjectSummary(project: Project, markerCount: number): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    date: project.createdAt.split("T")[0] ?? project.createdAt,
    videoCount: project.videoPath ? 1 : 0,
    markerCount,
  };
}

export function toProjectDetail(project: Project, markerCount: number): ProjectDetail {
  return {
    ...toProjectSummary(project, markerCount),
    videoPath: project.videoPath,
    videoName: project.videoName,
    videoDuration: project.videoDuration,
    videoFormat: project.videoFormat,
  };
}
