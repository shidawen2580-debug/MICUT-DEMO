import fs from "node:fs/promises";
import path from "node:path";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import type { ProjectDetail } from "../../domain/projects/project.js";
import { toProjectDetail } from "../../domain/projects/project.js";
import type { ProjectRepository } from "../../domain/projects/project-repository.js";
import type { VideoInspector } from "../../domain/media/video-inspector.js";
import { isSupportedVideoFormat } from "../../domain/media/video-format.js";
import { err, ok, type Result } from "../../shared/result.js";

export type BindProjectVideoError = "PROJECT_NOT_FOUND" | "VIDEO_NOT_FOUND" | "INVALID_VIDEO_FILE";

export interface BindProjectVideoDependencies {
  projectRepository: ProjectRepository;
  markerRepository: MarkerRepository;
  videoInspector: VideoInspector;
}

export async function bindProjectVideo(
  { projectRepository, markerRepository, videoInspector }: BindProjectVideoDependencies,
  projectId: string,
  videoPath: string,
): Promise<Result<ProjectDetail, BindProjectVideoError>> {
  const project = await projectRepository.getById(projectId);
  if (!project) {
    return err("PROJECT_NOT_FOUND");
  }

  const trimmedPath = videoPath.trim();
  if (!trimmedPath) {
    return err("VIDEO_NOT_FOUND");
  }

  const normalizedPath = path.normalize(trimmedPath);
  try {
    await fs.access(normalizedPath);
  } catch {
    return err("VIDEO_NOT_FOUND");
  }

  if (!isSupportedVideoFormat(normalizedPath)) {
    return err("INVALID_VIDEO_FILE");
  }

  const metadata = await videoInspector.inspect(normalizedPath);
  await projectRepository.updateVideo(projectId, {
    videoPath: metadata.path,
    videoName: metadata.name,
    videoDuration: metadata.durationSeconds,
    videoFormat: metadata.format,
  });

  const updatedProject = await projectRepository.getById(projectId);
  if (!updatedProject) {
    return err("PROJECT_NOT_FOUND");
  }

  const markerCount = await markerRepository.countByProjectId(projectId);
  return ok(toProjectDetail(updatedProject, markerCount));
}
