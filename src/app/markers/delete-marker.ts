import { toMarkerView, type MarkerView } from "../../domain/markers/marker.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import { err, ok, type Result } from "../../shared/result.js";

export type DeleteMarkerError = "MARKER_NOT_FOUND";

export interface DeleteMarkerDependencies {
  markerRepository: MarkerRepository;
}

export async function deleteMarker(
  { markerRepository }: DeleteMarkerDependencies,
  projectId: string,
  markerId: string,
): Promise<Result<MarkerView, DeleteMarkerError>> {
  const marker = await markerRepository.getById(projectId, markerId);
  if (!marker) {
    return err("MARKER_NOT_FOUND");
  }

  await markerRepository.delete(projectId, markerId);
  return ok(toMarkerView(marker));
}
