import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = new Map();

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--help") {
    console.log("Usage: node scripts/verify-artifacts.mjs [--manifest PATH] [--artifacts-dir PATH] [--id ID]");
    process.exit(0);
  }
  if (!["--manifest", "--artifacts-dir", "--id"].includes(argument)) {
    throw new Error(`Unknown option: ${argument}`);
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${argument}`);
  }
  options.set(argument, resolve(value));
  index += 1;
}

const manifestPath = options.get("--manifest") ?? resolve(projectDirectory, "artifacts/manifest.json");
const artifactDirectory = options.get("--artifacts-dir") ?? resolve(projectDirectory, "artifacts");
const selectedId = options.get("--id");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.formatVersion !== 1 || !Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
  throw new Error("Manifest must have formatVersion 1 and a non-empty artifacts array");
}

const ids = new Set();
const files = new Set();
let matchedSelectedId = false;
let hasFailure = false;

for (const artifact of manifest.artifacts) {
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    console.error("FAIL invalid manifest entry: expected an object");
    hasFailure = true;
    continue;
  }

  const { id, file, sha256 } = artifact;
  if (
    typeof id !== "string" ||
    !id ||
    typeof file !== "string" ||
    file === "." ||
    file === ".." ||
    file.includes("\\") ||
    basename(file) !== file ||
    typeof sha256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(sha256) ||
    ids.has(id) ||
    files.has(file)
  ) {
    console.error(`FAIL invalid or duplicate manifest entry: ${String(id)}`);
    hasFailure = true;
    continue;
  }
  ids.add(id);
  files.add(file);

  if (selectedId && id !== selectedId) {
      continue;
  }
  matchedSelectedId = true;

  const filePath = resolve(artifactDirectory, file);
  try {
    const metadata = await lstat(filePath);
    if (!metadata.isFile()) {
      throw new Error("not a regular file");
    }

    const digest = createHash("sha256");
    for await (const chunk of createReadStream(filePath)) {
      digest.update(chunk);
    }
    const actual = digest.digest("hex");
    if (actual.toLowerCase() !== sha256.toLowerCase()) {
      console.error(`FAIL ${id}: expected ${sha256}, got ${actual}`);
      hasFailure = true;
    } else {
      console.log(`PASS ${id} (${metadata.size} bytes, SHA-256 ${actual})`);
    }
  } catch (error) {
    console.error(`FAIL ${id}: ${error.message}`);
    hasFailure = true;
  }
}

if (selectedId && !matchedSelectedId) {
  console.error(`FAIL no artifact found with id: ${selectedId}`);
  hasFailure = true;
}

if (hasFailure) {
  process.exitCode = 1;
} else {
  const verifiedCount = selectedId ? 1 : manifest.artifacts.length;
  console.log(`Verified ${verifiedCount} artifact(s).`);
}
