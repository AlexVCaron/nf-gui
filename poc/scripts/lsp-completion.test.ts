import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCompletionResult } from "../src/lspCompletion.ts";

test("normalizes completion arrays and completion lists", () => {
  const item = { label: "Channel", kind: 7 };
  assert.deepEqual(normalizeCompletionResult([item]), {
    items: [item],
    incomplete: false,
  });
  assert.deepEqual(normalizeCompletionResult({ items: [item], isIncomplete: true }), {
    items: [item],
    incomplete: true,
  });
});

test("drops malformed items and tolerates invalid completion result shapes", () => {
  assert.deepEqual(normalizeCompletionResult({
    items: [null, {}, { label: 4 }, { label: { label: "process" } }],
    isIncomplete: "yes",
  }), {
    items: [{ label: { label: "process" } }],
    incomplete: false,
  });
  assert.deepEqual(normalizeCompletionResult(null), { items: [], incomplete: false });
  assert.deepEqual(normalizeCompletionResult({ items: "invalid" }), {
    items: [],
    incomplete: false,
  });
});
