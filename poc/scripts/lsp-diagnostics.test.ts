import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentDiagnosticsNotification } from "../src/lspDiagnostics.ts";

test("accepts diagnostics for the current URI and document version", () => {
  const params = {
    uri: "file:///nf-gui/main.nf",
    version: 4,
    diagnostics: [],
  };
  assert.equal(isCurrentDiagnosticsNotification(params, params.uri, 4), true);
});

test("ignores diagnostics for stale versions or another document", () => {
  const params = {
    uri: "file:///nf-gui/main.nf",
    version: 3,
    diagnostics: [],
  };
  assert.equal(isCurrentDiagnosticsNotification(params, params.uri, 4), false);
  assert.equal(
    isCurrentDiagnosticsNotification(params, "file:///nf-gui/other.nf", 3),
    false,
  );
});

test("accepts versionless notifications and rejects malformed versions", () => {
  const versionless = { uri: "file:///nf-gui/main.nf", diagnostics: [] };
  assert.equal(isCurrentDiagnosticsNotification(versionless, versionless.uri, 4), true);
  for (const version of ["4", -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(
      isCurrentDiagnosticsNotification(
        { ...versionless, version },
        versionless.uri,
        4,
      ),
      false,
    );
  }
});

test("rejects malformed notification shapes", () => {
  assert.equal(isCurrentDiagnosticsNotification(null, "uri", 1), false);
  assert.equal(isCurrentDiagnosticsNotification({ uri: "uri", diagnostics: {} }, "uri", 1), false);
});
