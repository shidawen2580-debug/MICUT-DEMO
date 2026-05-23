import test from "node:test";
import assert from "node:assert/strict";
import { getClipRule } from "../../../../src/app/clip-rules/get-clip-rule.js";

test("getClipRule falls back to default 10/5 rule", async () => {
  const rule = await getClipRule({
    clipRuleRepository: {
      async getByProjectId() {
        return null;
      },
      async upsert() {
        return undefined;
      },
    },
  }, "project_1");

  assert.equal(rule.projectId, "project_1");
  assert.equal(rule.beforeSeconds, 10);
  assert.equal(rule.afterSeconds, 5);
  assert.equal(rule.updatedAt, null);
});
