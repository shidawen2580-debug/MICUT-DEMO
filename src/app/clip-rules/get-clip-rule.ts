import { createDefaultClipRule, type ClipRule } from "../../domain/clip-rules/clip-rule.js";
import type { ClipRuleRepository } from "../../domain/clip-rules/clip-rule-repository.js";

export interface GetClipRuleDependencies {
  clipRuleRepository: ClipRuleRepository;
}

export async function getClipRule({ clipRuleRepository }: GetClipRuleDependencies, projectId: string): Promise<ClipRule> {
  return (await clipRuleRepository.getByProjectId(projectId)) ?? createDefaultClipRule(projectId);
}
