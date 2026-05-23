import type { ClipRule } from "../../domain/clip-rules/clip-rule.js";
import type { ClipRuleRepository } from "../../domain/clip-rules/clip-rule-repository.js";
import type { SqliteContext } from "./sqlite-database.js";

export class SqliteClipRuleRepository implements ClipRuleRepository {
  constructor(private readonly context: SqliteContext) {}

  async getByProjectId(projectId: string): Promise<ClipRule | null> {
    const row = this.context.db.prepare("SELECT * FROM clip_rules WHERE projectId = ?").get(projectId) as ClipRule | undefined;
    return row ?? null;
  }

  async upsert(rule: ClipRule): Promise<void> {
    this.context.db
      .prepare(`
        INSERT INTO clip_rules (projectId, beforeSeconds, afterSeconds, updatedAt)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(projectId) DO UPDATE SET
          beforeSeconds = excluded.beforeSeconds,
          afterSeconds = excluded.afterSeconds,
          updatedAt = excluded.updatedAt
      `)
      .run(rule.projectId, rule.beforeSeconds, rule.afterSeconds, rule.updatedAt ?? new Date().toISOString());
  }
}
