import assert from "node:assert/strict";
import test from "node:test";
import { diagnosticsAtPosition } from "../src/lspHover.ts";

const diagnostic = {
  startLineNumber: 3,
  startColumn: 5,
  endLineNumber: 3,
  endColumn: 12,
  message: "Invalid process declaration",
};

test("selects diagnostics covering the hovered position, including range boundaries", () => {
  assert.deepEqual(diagnosticsAtPosition([diagnostic], { lineNumber: 3, column: 5 }), [
    diagnostic,
  ]);
  assert.deepEqual(diagnosticsAtPosition([diagnostic], { lineNumber: 3, column: 12 }), [
    diagnostic,
  ]);
  assert.deepEqual(diagnosticsAtPosition([diagnostic], { lineNumber: 3, column: 8 }), [
    diagnostic,
  ]);
});

test("does not select diagnostics outside their range", () => {
  assert.deepEqual(diagnosticsAtPosition([diagnostic], { lineNumber: 2, column: 8 }), []);
  assert.deepEqual(diagnosticsAtPosition([diagnostic], { lineNumber: 3, column: 4 }), []);
  assert.deepEqual(diagnosticsAtPosition([diagnostic], { lineNumber: 3, column: 13 }), []);
  assert.deepEqual(diagnosticsAtPosition([diagnostic], { lineNumber: 4, column: 8 }), []);
});
