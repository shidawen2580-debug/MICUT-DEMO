import type { Marker } from "../../domain/markers/marker.js";
import type { MarkerRepository } from "../../domain/markers/marker-repository.js";
import type { SqliteContext } from "./sqlite-database.js";

export class SqliteMarkerRepository implements MarkerRepository {
  constructor(private readonly context: SqliteContext) {}

  async listByProjectId(projectId: string): Promise<Marker[]> {
    return this.context.db
      .prepare("SELECT * FROM markers WHERE projectId = ? ORDER BY timestampSeconds ASC, createdAt ASC")
      .all(projectId) as Marker[];
  }

  async getById(projectId: string, markerId: string): Promise<Marker | null> {
    const row = this.context.db
      .prepare("SELECT * FROM markers WHERE id = ? AND projectId = ?")
      .get(markerId, projectId) as Marker | undefined;
    return row ?? null;
  }

  async create(marker: Marker): Promise<void> {
    this.context.db
      .prepare(`
        INSERT INTO markers (id, projectId, timestampSeconds, description, source, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(marker.id, marker.projectId, marker.timestampSeconds, marker.description, marker.source, marker.createdAt);
  }

  async createMany(markers: Marker[]): Promise<void> {
    const insert = this.context.db.prepare(`
      INSERT INTO markers (id, projectId, timestampSeconds, description, source, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const transaction = this.context.db.transaction((rows: Marker[]) => {
      for (const marker of rows) {
        insert.run(marker.id, marker.projectId, marker.timestampSeconds, marker.description, marker.source, marker.createdAt);
      }
    });
    transaction(markers);
  }

  async delete(_projectId: string, markerId: string): Promise<void> {
    this.context.db.prepare("DELETE FROM markers WHERE id = ?").run(markerId);
  }

  async countByProjectId(projectId: string): Promise<number> {
    const row = this.context.db.prepare("SELECT COUNT(*) as count FROM markers WHERE projectId = ?").get(projectId) as { count: number };
    return row.count;
  }
}
