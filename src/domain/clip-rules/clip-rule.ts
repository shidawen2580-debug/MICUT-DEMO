export interface ClipRule {
  projectId: string;
  beforeSeconds: number;
  afterSeconds: number;
  updatedAt: string | null;
}

export const DEFAULT_CLIP_RULE = {
  beforeSeconds: 10,
  afterSeconds: 5,
} as const;

export function createDefaultClipRule(projectId: string): ClipRule {
  return {
    projectId,
    beforeSeconds: DEFAULT_CLIP_RULE.beforeSeconds,
    afterSeconds: DEFAULT_CLIP_RULE.afterSeconds,
    updatedAt: null,
  };
}

export function isValidClipRuleInput(beforeSeconds: number, afterSeconds: number): boolean {
  return Number.isFinite(beforeSeconds) && beforeSeconds >= 0 && Number.isFinite(afterSeconds) && afterSeconds >= 0;
}
