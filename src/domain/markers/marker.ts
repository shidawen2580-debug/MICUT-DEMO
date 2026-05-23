export type MarkerSource = "manual" | "excel";

export interface Marker {
  id: string;
  projectId: string;
  timestampSeconds: number;
  description: string;
  source: MarkerSource;
  createdAt: string;
}

export interface MarkerView {
  id: string;
  timestamp: number;
  description: string;
  source: MarkerSource;
}

export function toMarkerView(marker: Marker): MarkerView {
  return {
    id: marker.id,
    timestamp: marker.timestampSeconds,
    description: marker.description,
    source: marker.source,
  };
}
