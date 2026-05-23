import type { Marker, MarkerView } from "../../domain/markers/marker.js";
import { toMarkerView } from "../../domain/markers/marker.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import type { MarkerImporter } from "../../domain/markers/marker-importer.js";
import type { ProjectRepository } from "../../domain/projects/project-repository.js";
import type { Clock } from "../../shared/clock.js";
import type { IdGenerator } from "../../shared/id-generator.js";
import { err, ok, type Result } from "../../shared/result.js";

export interface ImportExcelMarkersResult {
  imported: MarkerView[];
  errors?: string[];
}

export type ImportExcelMarkersError = "PROJECT_NOT_FOUND" | "NO_VALID_MARKERS";

export interface ImportExcelMarkersDependencies {
  projectRepository: ProjectRepository;
  markerRepository: MarkerRepository;
  markerImporter: MarkerImporter;
  idGenerator: IdGenerator;
  clock: Clock;
}

export async function importExcelMarkers(
  { projectRepository, markerRepository, markerImporter, idGenerator, clock }: ImportExcelMarkersDependencies,
  projectId: string,
  input: string | Buffer,
): Promise<Result<ImportExcelMarkersResult, ImportExcelMarkersError>> {
  const project = await projectRepository.getById(projectId);
  if (!project) {
    return err("PROJECT_NOT_FOUND");
  }

  const parsed = await markerImporter.parse(input);
  if (parsed.data.length === 0 && parsed.errors.length > 0) {
    return err("NO_VALID_MARKERS");
  }

  const createdAt = clock.now().toISOString();
  const markers: Marker[] = parsed.data.map((row) => ({
    id: idGenerator.next("marker"),
    projectId,
    timestampSeconds: row.timestampSeconds,
    description: row.description,
    source: "excel",
    createdAt,
  }));

  await markerRepository.createMany(markers);

  return ok({
    imported: markers.map(toMarkerView),
    ...(parsed.errors.length > 0 ? { errors: parsed.errors } : {}),
  });
}
