import type { Marker, MarkerView } from "../../domain/markers/marker.js";
import { toMarkerView } from "../../domain/markers/marker.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import type { ProjectRepository } from "../../domain/projects/project-repository.js";
import type { Clock } from "../../shared/clock.js";
import type { IdGenerator } from "../../shared/id-generator.js";
import { err, ok, type Result } from "../../shared/result.js";

export type CreateMarkerError = "PROJECT_NOT_FOUND" | "INVALID_TIMESTAMP";

export interface CreateMarkerInput {
  projectId: string;
  timestamp: number;
  description: string;
}

export interface CreateMarkerDependencies {
  projectRepository: ProjectRepository;
  markerRepository: MarkerRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

export async function createMarker(
  { projectRepository, markerRepository, idGenerator, clock }: CreateMarkerDependencies,
  input: CreateMarkerInput,
): Promise<Result<MarkerView, CreateMarkerError>> {
  const project = await projectRepository.getById(input.projectId);
  if (!project) {
    return err("PROJECT_NOT_FOUND");
  }

  if (!Number.isFinite(input.timestamp) || input.timestamp < 0) {
    return err("INVALID_TIMESTAMP");
  }

  const marker: Marker = {
    id: idGenerator.next("marker"),
    projectId: input.projectId,
    timestampSeconds: input.timestamp,
    description: input.description.trim(),
    source: "manual",
    createdAt: clock.now().toISOString(),
  };

  await markerRepository.create(marker);
  return ok(toMarkerView(marker));
}
