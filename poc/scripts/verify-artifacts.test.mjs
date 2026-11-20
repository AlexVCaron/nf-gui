import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptPath = fileURLToPath(new URL("./verify-artifacts.mjs", import.meta.url));

async function createFixture(t, { file = "runtime.bin", contents = "pinned artifact", sha256 } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "nf-gui-artifact-test-"));
  const artifactsDirectory = join(directory, "artifacts");
  await mkdir(artifactsDirectory);
  t.after(() => rm(directory, { recursive: true, force: true }));

  const digest = sha256 ?? createHash("sha256").update(contents).digest("hex");
  const artifact = { id: "fixture-runtime", file, sha256: digest };
  const manifestPath = join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({ formatVersion: 1, artifacts: [artifact] }));

  return { directory, artifactsDirectory, manifestPath, artifact, contents };
}

function verify(fixture) {
  return spawnSync(
    process.execPath,
    [
      scriptPath,
      "--manifest",
      fixture.manifestPath,
      "--artifacts-dir",
      fixture.artifactsDirectory,
    ],
    { encoding: "utf8" },
  );
}

test("accepts a regular artifact matching its SHA-256", async (t) => {
  const fixture = await createFixture(t);
  await writeFile(join(fixture.artifactsDirectory, fixture.artifact.file), fixture.contents);

  const result = verify(fixture);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS fixture-runtime/);
});

test("rejects an artifact with a mismatched SHA-256", async (t) => {
  const fixture = await createFixture(t, { sha256: "0".repeat(64) });
  await writeFile(join(fixture.artifactsDirectory, fixture.artifact.file), fixture.contents);

  const result = verify(fixture);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /expected 0000/);
});

test("rejects missing artifacts", async (t) => {
  const fixture = await createFixture(t);

  const result = verify(fixture);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /ENOENT/);
});

test("rejects filenames that escape the artifact directory", async (t) => {
  const fixture = await createFixture(t, { file: "../outside.bin" });

  const result = verify(fixture);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid or duplicate manifest entry/);
});

test("rejects symlinked artifact files", async (t) => {
  const fixture = await createFixture(t);
  const outsideFile = resolve(fixture.directory, "outside.bin");
  await writeFile(outsideFile, fixture.contents);

  try {
    await symlink(outsideFile, join(fixture.artifactsDirectory, fixture.artifact.file));
  } catch (error) {
    if (process.platform === "win32") {
      t.skip(`symlink creation is unavailable: ${error.message}`);
    }
    throw error;
  }

  const result = verify(fixture);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /not a regular file/);
});
