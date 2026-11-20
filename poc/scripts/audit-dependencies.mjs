import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("Run this command through npm: npm run audit:dependencies");
  process.exit(2);
}

const checks = ["audit:npm", "audit:cargo"];
let failed = false;

for (const check of checks) {
  console.log(`\n==> Running ${check}`);
  const result = spawnSync(process.execPath, [npmCli, "run", check], {
    cwd: projectDirectory,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`${check} could not start: ${result.error.message}`);
    failed = true;
  } else if (result.status !== 0) {
    console.error(`${check} failed with status ${result.status ?? "unknown"}`);
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("\nAll dependency advisory checks passed.");
}
