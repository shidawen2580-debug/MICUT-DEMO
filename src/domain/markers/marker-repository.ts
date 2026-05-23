import type { Marker } from "./marker.js";

export interface MarkerRepository {
  listByProjectId(projectId: string): Promise<Marker[]>;
  getById(projectId: string, markerId: string): Promise<Marker | null>;
  create(marker: Marker): Promise<void>;
  createMany(markers: Marker[]): Promise<void>;
  delete(projectId: string, markerId: string): Promise<void>;
  countByProjectId(projectId: string): Promise<number>;
}
