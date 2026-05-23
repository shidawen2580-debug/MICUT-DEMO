import type { ImportedMarkerRow } from "./excel-marker-parser.js";

export interface MarkerImporterResult {
  data: ImportedMarkerRow[];
  errors: string[];
}

export interface MarkerImporter {
  parse(input: string | Buffer): Promise<MarkerImporterResult>;
}
