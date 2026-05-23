import { isValidClipRuleInput, type ClipRule } from "../../domain/clip-rules/clip-rule.js";
import type { ClipRuleRepository } from "../../domain/clip-rules/clip-rule-repository.js";
import type { Clock } from "../../shared/clock.js";
import { err, ok, type Result } from "../../shared/result.js";

export type UpdateClipRuleError = "INVALID_CLIP_RULE";

export interface UpdateClipRuleDependencies {
  clipRuleRepository: ClipRuleRepository;
  clock: Clock;
}

export async function updateClipRule(
  { clipRuleRepository, clock }: UpdateClipRuleDependencies,
  projectId: string,
  beforeSeconds: number,
  afterSeconds: number,
): Promise<Result<ClipRule, UpdateClipRuleError>> {
  if (!isValidClipRuleInput(beforeSeconds, afterSeconds)) {
    return err("INVALID_CLIP_RULE");
  }

  const rule: ClipRule = {
    projectId,
    beforeSeconds,
    afterSeconds,
    updatedAt: clock.now().toISOString(),
  };

  await clipRuleRepository.upsert(rule);
  return ok(rule);
}
