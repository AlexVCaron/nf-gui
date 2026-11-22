#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
POC_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ARTIFACT_DIR="$POC_DIR/artifacts"
ARTIFACT_STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nf-gui-codespace-artifact.XXXXXX")"
ARTIFACT_TMP="$ARTIFACT_STAGING_DIR/language-server-all.jar"

cleanup() {
  rm -rf -- "$ARTIFACT_STAGING_DIR"
}
trap cleanup EXIT

for command_name in node npm cargo rustc java curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s. Rebuild the Codespace container and try again.\n' "$command_name" >&2
    exit 1
  fi
done

node_version="$(node -p 'process.versions.node')"
node_major="${node_version%%.*}"
node_minor="$(cut -d. -f2 <<<"$node_version")"
if (( node_major < 22 || (node_major == 22 && node_minor < 12) )); then
  printf 'Node.js 22.12 or newer is required; found %s.\n' "$node_version" >&2
  exit 1
fi

java_version="$(java -version 2>&1 | sed -nE 's/.*version "([0-9]+).*/\1/p' | head -n1)"
if [[ -z "$java_version" ]] || (( java_version < 17 )); then
  printf 'Java 17 or newer is required; found %s.\n' "${java_version:-unknown}" >&2
  exit 1
fi

cd "$POC_DIR"
npm ci
mkdir -p "$ARTIFACT_DIR"

artifact_url="https://github.com/nextflow-io/language-server/releases/download/v26.10.2/language-server-all.jar"
curl --fail --location --retry 3 --retry-all-errors --connect-timeout 20 \
  "$artifact_url" --output "$ARTIFACT_TMP"
node scripts/verify-artifacts.mjs --id nextflow-language-server \
  --artifacts-dir "$ARTIFACT_STAGING_DIR"
mkdir -p "$ARTIFACT_DIR"
mv -- "$ARTIFACT_TMP" "$ARTIFACT_DIR/language-server-all.jar"

printf '\nCodespace setup complete. Run tests with `npm test` and launch the desktop with `npm run codespace:desktop`.\n'
