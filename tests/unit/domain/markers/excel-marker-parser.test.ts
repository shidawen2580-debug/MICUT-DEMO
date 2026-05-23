import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTimestamp, parseExcelMarkerRows } from "../../../../src/domain/markers/excel-marker-parser.js";

test("normalizeTimestamp handles excel fractional days", () => {
  assert.equal(normalizeTimestamp(10 / 86400), 10);
});

test("normalizeTimestamp handles hh:mm:ss strings", () => {
  assert.equal(normalizeTimestamp("01:02:03"), 3723);
});

test("parseExcelMarkerRows returns valid rows and row-level errors", () => {
  const result = parseExcelMarkerRows([
    { 时间: 10, 描述: "测试打点" },
    { timestamp: "00:00:20", description: "second" },
    { 时间: "bad", 描述: "invalid" },
  ]);

  assert.equal(result.data.length, 2);
  assert.deepEqual(result.data[0], {
    timestampSeconds: 10,
    description: "测试打点",
  });
  assert.equal(result.errors.length, 1);
});
