import { toMarkerView, type MarkerView } from "../../domain/markers/marker.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";

export interface ListMarkersDependencies {
  markerRepository: MarkerRepository;
}

export async function listMarkers({ markerRepository }: ListMarkersDependencies, projectId: string): Promise<MarkerView[]> {
  const markers = await markerRepository.listByProjectId(projectId);
  return markers
    .slice()
    .sort((left, right) => left.timestampSeconds - right.timestampSeconds)
    .map(toMarkerView);
}
