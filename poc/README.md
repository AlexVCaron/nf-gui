# nf-gui prototype

This is a small, runnable Tauri/React prototype and a repeatable checkpoint for
dependency and runtime-artifact reviews. It is not the nf-gui application.
Project code is licensed under the repository [MIT License](../LICENSE).
Dependencies retain their own open-source licenses and notices; the project
license does not replace those obligations.

## What it demonstrates

- Tauri 2.9.2 desktop shell with a React/TypeScript/Vite frontend.
- A local Monaco plain-text editor and a static React Flow canvas.
- Exact direct dependency pins plus `package-lock.json` and `src-tauri/Cargo.lock`.
- A local-only SHA-256 verifier for the optional Nextflow language-server JAR
  and nf-schema plugin blob.

The editor and graph are independent examples: changing the editor does not
change the graph. The prototype has no language-server bridge, file access,
pipeline execution, plugin loading, downloads, Tauri commands, or external
navigation. Do not use it to open or analyze an untrusted workflow.

## Run

Prerequisites: Node.js 22.12+ (Vite 8), npm, Rust/Cargo, and the platform
dependencies listed in the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).
The current Linux runner lacks `webkit2gtk` and `rsvg2`, so native Tauri builds
also need the system development libraries installed first. Its attempted
native build stopped at missing `glib-2.0` pkg-config metadata.

From this directory:

```sh
npm ci
npm run build
npm test
npm run tauri dev
```

The Vite development server binds only to `127.0.0.1`. The Tauri window uses a
restrictive CSP and has no enabled capability permissions.

## Dependency and artifact review

The lockfiles are the resolved dependency graphs; do not infer transitive
exposure from the direct versions in `package.json` or `Cargo.toml`.

```sh
npm run audit:tree
npm run audit:npm
cargo install cargo-audit --version 0.23.0 --locked
npm run audit:cargo
npm sbom --sbom-format=cyclonedx > /tmp/nf-gui-poc.npm.cdx.json
cargo metadata --format-version 1 --locked > /tmp/nf-gui-poc.cargo-metadata.json
```

`npm run audit:dependencies` runs both checks even if the first one fails and
returns a failure if either check fails. Review the license, source, and integrity fields in the npm SBOM and Cargo
metadata. The current lockfiles declare open-source licenses for all 54 npm
components and 493 third-party Cargo packages. Accept open-source licenses,
including copyleft, and comply with their terms; escalate only a confirmed
closed/proprietary dependency license. Missing or ambiguous metadata requires
investigation rather than an assumption that the dependency is closed.
Keep generated inventories outside the repository unless a reviewed, dated
snapshot is intentionally required.

At this baseline, `npm audit` reports five high-severity findings in the Vite
development/build chain through `picomatch` 4.0.7 (`GHSA-fc5q-39xc-vjpf`). The
advisory has no patched picomatch release available. npm suggests downgrading
Vite to 6.2.7, but the advisory review also flags that Vite line for a
dev-server WebSocket file-read issue (through 6.4.1) and a separate
`launch-editor` issue (through 6.4.3). Vite 6.4.4 includes the latter fixes but
still depends on the affected `picomatch` range. Do not apply a Vite-only
downgrade or use `npm audit fix` to silence the finding. Keep the dev server
loopback-only and re-run both advisory checks whenever the lockfile changes.

The current `cargo audit --deny warnings` also reports five RustSec warnings in
the lockfile (three unmaintained crates and two unsoundness advisories).
The `chrono` warning is present in Cargo.lock through an optional `serde_with`
feature but has no active dependency path in `cargo tree --target all`; the
other warnings are reachable through Tauri's transitive dependencies, including
platform-specific GTK/WebKit dependencies. Cargo-audit checks locked packages,
including optional entries.
The RustSec database did not report the separate Tauri 2.9.2 Windows/Android
GHSA. Keep both results visible; do not treat the tool's exit status as an
override of the upstream advisory or the unresolved warnings.

Tauri 2.9.2 is retained only for this prototype. It is affected by
[GHSA-7gmj-67g7-phm9](https://github.com/advisories/GHSA-7gmj-67g7-phm9) on
Windows and Android. The advisory database tool did not report this finding,
so the explicit advisory controls: do not ship or claim Windows/Android support
until Tauri is upgraded to a patched version (at least 2.11.1) and the full
dependency graph is re-audited. A passing scanner result cannot override a
known advisory.

The prototype's own code is MIT-licensed. This does not relicense its
dependencies; preserve each dependency's attribution and license notices and
meet any applicable source-availability obligations.

### Deferred security risks and upgrade gates

The user has accepted the current npm and RustSec findings for local PoC/Phase 1
work only. npm still reports five high findings in the Vite/picomatch build
graph; RustSec reports five warnings in the locked Tauri graph. These are
deferred, not fixed or scanner false positives. Keep the dev server bound to
`127.0.0.1`; rerun audits after dependency changes and before distribution.
The exact findings and RustSec package paths are recorded in the
[Phase 0 risk register](../docs/plan/phase-0-audit-findings.md#accepted-and-deferred-risks).

Tauri 2.9.2 remains a PoC-only choice. Do not ship or claim Windows/Android
support until upgrading to at least 2.11.1 and re-auditing. The nf-schema blob
was not verified and is not included or enabled; verify its digest/provenance
and resolve the version boundary before use. The Monaco LSP bridge is also
deferred pending compatibility and advisory review. None of these deferrals
indicates that the dependency graph is suitable for a release.

### Verify optional runtime artifacts

The artifact files are intentionally not committed. Download them only from the
sources and versions in [`artifacts/manifest.json`](artifacts/manifest.json),
then verify them locally:

```sh
curl -fL \
  https://github.com/nextflow-io/language-server/releases/download/v26.04.4/language-server-all.jar \
  -o artifacts/language-server-all.jar
curl -fL \
  'https://public.cr.seqera.io/v2/nextflow/plugin/nf-schema/blobs/sha256:1466fea73502dda8c8059dfe4190be1a857151bc2a500a87a86ffd223918a3f2' \
  -o artifacts/nf-schema-2.8.0.blob
npm run audit:artifacts
```

The verifier reads only local regular files, checks SHA-256, rejects symlinked
files and path-containing filenames, and never downloads or executes artifacts.
To verify a different manifest or staging directory, use
`node scripts/verify-artifacts.mjs --manifest PATH --artifacts-dir PATH`.
On any update, first verify the upstream release/tag and license, update the
manifest's version/source/digest and provenance citation together, download to
a temporary local directory, and require a passing verifier result before
recording the artifact as approved. Do not weaken or remove a digest to make a
check pass.

The pinned language-server JAR was downloaded to a temporary directory and
matched its recorded SHA-256. The nf-schema registry host could not be resolved;
the plugin is intentionally deferred and is not approved for use until the
manifest digest and provenance are verified.

## Updating the prototype for future blockers

1. Record the affected task ID, exact blocker, evidence, and next action in
   [`../PLAN_TRACKING.md`](../PLAN_TRACKING.md) and
   [`../CHANGELOG.md`](../CHANGELOG.md); leave its checkbox open until the
   required evidence and checks pass.
2. Select exact direct versions, roles, licenses, and source/provenance. Check
   them with the GitHub advisory database before adding/updating dependencies.
3. Update manifests through npm/Cargo, commit both lockfiles, and inspect the
   complete resolved graphs (`npm ls`, `npm sbom`, `cargo tree`, and
   `cargo metadata`).
4. Run both advisory scanners, the artifact verifier, and the prototype build.
   Record failures and unavailable checks as blockers; do not hide known
   advisories with audit exceptions, stale lockfiles, or undocumented overrides.
5. Update this README and the P0-07 evidence with the exact outcome, then update
   the tracker and changelog together.

The current lockfiles establish the first real JavaScript and Rust dependency
graphs. P0-07 and P0-EXIT are complete for this non-shipping scope by explicit
risk deferral, not because the audits are clean. Re-open them before
distribution, material dependency changes, platform support, or enabling
deferred artifacts.
