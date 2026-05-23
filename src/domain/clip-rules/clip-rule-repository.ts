import type { ClipRule } from "./clip-rule.js";

export interface ClipRuleRepository {
  getByProjectId(projectId: string): Promise<ClipRule | null>;
  upsert(rule: ClipRule): Promise<void>;
}
