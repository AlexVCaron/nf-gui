import assert from "node:assert/strict";
import test from "node:test";
import { diagnosticsAtPosition, resolveHoverContents } from "../src/lspHover.ts";

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

test("returns a matching diagnostic immediately without waiting for server hover", async () => {
  const diagnosticHover = { value: diagnostic.message, isTrusted: false, supportHtml: false } as const;
  let serverHoverRequested = false;

  const contents = await resolveHoverContents(
    [diagnosticHover],
    async () => {
      serverHoverRequested = true;
      return [];
    },
    new AbortController().signal,
    20,
  );

  assert.deepEqual(contents, [diagnosticHover]);
  assert.equal(serverHoverRequested, false);
});

test("returns an empty result when the server has no hover content", async () => {
  const contents = await resolveHoverContents(
    [],
    async () => [],
    new AbortController().signal,
    20,
  );
  assert.deepEqual(contents, []);
});

test("bounds a slow server hover request and cancels it", async () => {
  let requestSignal: AbortSignal | undefined;

  const contents = await resolveHoverContents(
    [],
    (signal) => {
      requestSignal = signal;
      return new Promise(() => {});
    },
    new AbortController().signal,
    20,
  );

  assert.deepEqual(contents, []);
  assert.equal(requestSignal?.aborted, true);
});

test("honors Monaco hover cancellation", async () => {
  const cancellation = new AbortController();
  let requestSignal: AbortSignal | undefined;

  const contentsPromise = resolveHoverContents(
    [],
    (signal) => {
      requestSignal = signal;
      return new Promise(() => {});
    },
    cancellation.signal,
    1_000,
  );
  cancellation.abort();

  assert.deepEqual(await contentsPromise, []);
  assert.equal(requestSignal?.aborted, true);
});
