import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptPath = fileURLToPath(new URL("./audit-dependencies.mjs", import.meta.url));

async function runAuditOrchestrator(t, { fail = [] } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "nf-gui-audit-runner-test-"));
  const fakeNpmPath = join(directory, "npm-cli.mjs");
  const callsPath = join(directory, "calls.txt");
  await writeFile(
    fakeNpmPath,
    `import { appendFileSync } from "node:fs";
const check = process.argv[3];
appendFileSync(process.env.TEST_CALLS_PATH, check + "\\n");
if (${JSON.stringify(fail)}.includes(check)) process.exitCode = 1;
`,
  );
  t.after(() => rm(directory, { recursive: true, force: true }));

  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      npm_execpath: fakeNpmPath,
      TEST_CALLS_PATH: callsPath,
    },
  });

  return { result, calls: await readFile(callsPath, "utf8") };
}

test("runs the Rust audit even when the npm audit fails", async (t) => {
  const { result, calls } = await runAuditOrchestrator(t, { fail: ["audit:npm"] });

  assert.equal(result.status, 1);
  assert.equal(calls, "audit:npm\naudit:cargo\n");
  assert.match(result.stdout, /Running audit:cargo/);
});

test("passes when both dependency audits pass", async (t) => {
  const { result, calls } = await runAuditOrchestrator(t);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls, "audit:npm\naudit:cargo\n");
  assert.match(result.stdout, /All dependency advisory checks passed/);
});
