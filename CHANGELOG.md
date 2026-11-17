# Changelog

[Main plan](PLAN.md) · [Task tracker](PLAN_TRACKING.md)

This file records planning and implementation advancement, not just releases.
Update it alongside the tracker whenever working on plan tasks, including
partial progress, blockers, validation limitations, and reopened work.

## Entry requirements

Add dated entries newest first, using a descriptive heading and stable task IDs.
Preserve historical entries; append corrections rather than silently rewriting
past outcomes. Each entry must include:

- **Tasks/status:** IDs and what completed, progressed, blocked, or reopened.
- **Work and decisions:** concrete changes, rationale, scope changes, and links
  to affected files, findings, upstream references, or a PR/commit when available.
- **Validation:** checks performed and actual outcomes; explicitly distinguish
  passed, failed, not run, and unavailable checks. Do not imply research or tests
  occurred when they did not.
- **Limitations and next steps:** unresolved risks/blockers and actionable next
  task IDs. State when there are no known blockers.

Never put credentials, sensitive parameter values, or private environment
contents in reports.

## 2026-11-17 — Scaffolded the reusable Tauri prototype

### Tasks/status

- **P0-07 advanced but remains blocked:** real npm/Cargo dependency graphs and an
  artifact-verification workflow now exist; unresolved advisories, license and
  provenance evidence, and one unavailable artifact prevent completion.
- **P0-EXIT remains blocked:** the P0-07 findings are not dispositioned and the
  phase exit evidence is not complete.
- The prototype is a UI/build checkpoint, not completion of Phase 1 or a usable
  workflow editor.

### Work and decisions

- Generated `poc/` with the official Tauri React/TypeScript scaffold, then
  replaced its greeting screen with a local-only Monaco text buffer and a static
  React Flow sample. It has no workspace access, server, Tauri commands,
  permissions, plugin loading, or pipeline execution.
- Pinned frontend dependencies and added `package-lock.json`; pinned Tauri
  `2.9.2` and `tauri-build` `2.7.5` with `src-tauri/Cargo.lock`. The Tauri
  Windows/Android release gate remains unchanged.
- Added the reusable local SHA-256 manifest/verifier and exact download/update
  instructions for the language-server JAR and nf-schema blob. Artifacts are
  neither automatically downloaded nor committed.
- Trial resolution of the earlier Monaco LSP bridge candidates reported npm
  findings, so the prototype excludes `monaco-languageclient`, Codingame API,
  and `@tauri-apps/api`; the bridge remains a Phase 1 decision.
- Updated the [prototype guide](poc/README.md), [root README](README.md),
  [P0-07 findings](docs/plan/phase-0-audit-findings.md), capability matrix, and
  tracker with the evidence and current blockers.

### Validation

- `npm ci`, `npm test` (all five artifact-verifier cases), and `npm run build`
  passed. Vite emitted a large-chunk warning for
  Monaco but completed successfully.
- Browser smoke check rendered the editor and graph; the React Flow external
  attribution click stayed on the local page, and the missing-favicon 404 was
  corrected.
- The artifact verifier accepted the downloaded language-server JAR at
  `15326450` bytes with the expected SHA-256 and rejected a deliberately
  incorrect digest. The nf-schema registry host could not be resolved, so its
  blob remains unverified.
- `npm audit --omit=dev --audit-level=moderate` reported zero vulnerabilities.
  Full `npm audit` reports five high-severity findings through Vite's
  `picomatch` `4.0.7` dependency; no patched release was available. The tool's
  suggested Vite `6.2.7` downgrade conflicts with the separately recorded
  `launch-editor` affected range, so no automatic downgrade was applied.
- `cargo generate-lockfile`, `cargo metadata --locked`, `npm sbom`, dependency
  tree commands, and `cargo fmt --check` completed. Metadata covers 494 Cargo
  packages (the prototype crate has no declared license) and 54 npm components.
- `cargo audit --deny warnings` denied five RustSec warnings (three
  unmaintained and two unsoundness advisories); RustSec did not report the
  separate Tauri GHSA. The GitHub advisory tool also missed the known Tauri
  finding and Vite's transitive npm finding; explicit advisory records remain
  controlling.
- `npm run tauri build` reached the Rust build but could not complete because
  `glib-2.0` development metadata is absent; the generator also detected
  missing `webkit2gtk` and `rsvg2`   prerequisites. Internal Markdown file links and `git diff --check` passed.
  Secret scanning found no secrets. CodeQL reported no JavaScript alerts but
  timed out before completing all languages; do not treat that as a full scan.

### Limitations and next steps

- **P0-07:** resolve/disposition the Vite/picomatch findings and RustSec
  warnings, declare the prototype's license, independently verify nf-schema
  provenance and digest, re-review deferred LSP bridge versions, and reconcile
  advisory scanner gaps. Do not mark the task complete until the evidence meets
  its requirements.
- **P0-EXIT:** remains open until P0-07 is complete and the matrix is reviewed
  against the initial feature set.
- **Phase 1:** prove `@tauri-apps/api`/Tauri pairing, packaged Monaco worker/CSP,
  and IPC-to-stdio server transport. Upgrade Tauri and re-audit before
  Windows/Android support or shipment.

## 2026-11-17 — Tauri PoC baseline retained

### Tasks/status

- **P0-05 decision refined:** retain Tauri `2.9.2` for the PoC, as requested; this does not change the advisory finding.
- **P0-07/P0-EXIT remain blocked:** the PoC version decision is settled, but dependency artifact and resolved-graph evidence is still incomplete.

### Work and decisions

- Updated the capability matrix and P0-05/P0-07 findings to distinguish the PoC baseline from release targets.
- Tauri `2.9.2` is affected by GHSA-7gmj-67g7-phm9 on Windows/Android. Do not ship or claim support for those targets until upgrading to a patched Tauri version (at least `2.11.1`) and re-auditing.
- Keep the PoC on bundled trusted content and do not expose external navigation or privileged commands to remote content. This is a conservative exposure boundary, not a fix for the affected dependency.
- The Tauri advisory database query returned no findings despite the direct advisory's affected range; the discrepancy remains recorded and the direct advisory controls the release gate.
- Continued P0-07 provenance review: GitHub release metadata provides the `language-server-all.jar` SHA-256 `e1c5da90c7f0565ba9e64ac3c5b58f1215e315d6bfe4414d62ff2d02749e8887`; the Nextflow plugin registry provides nf-schema `2.8.0` blob SHA-256 `1466fea73502dda8c8059dfe4190be1a857151bc2a500a87a86ffd223918a3f2`. Tagged build and registry metadata indicate nf-schema 26.04.0 minimum, while its README says 25.10.0+; recorded the conservative 26.04.0+ boundary.

### Validation

- Reviewed the updated baseline and release gate against the primary advisory and crates.io version/checksum metadata.
- Whitespace and internal Markdown links/anchors passed; secret scanning passed. CodeQL ran after the documentation commit and skipped these documentation-only changes as trivial.
- No application tests/build/lint apply; no code or dependency manifest was added.

### Limitations and next steps

- **P0-07:** verify downloaded runtime artifacts against their recorded digests and create actual app manifests/lockfiles before auditing the resolved dependency graph.
- **Phase 1:** prove the Tauri/`@tauri-apps/api` PoC pair, packaged Monaco worker/CSP, and IPC-to-stdio transport. Upgrade and re-audit Tauri before Windows/Android support or shipment.

## 2026-11-17 22:04 UTC — Phase 0 audit decisions and dependency blockers

### Tasks/status

- **P0-01/P0-02 complete:** selected-release language-server and official editor evidence now covers tested capabilities, protocol, lifecycle, cancellation/freshness limits, and restart boundaries.
- **P0-03/P0-04 complete:** parser/compiler limitations and conservative schema UX decisions are recorded with version-pinned upstream references.
- **P0-05 complete:** Tauri/editor permissions, packaging, and compatibility requirements are audited; the production WebView/worker/transport proof remains a Phase 1 integration task.
- **P0-06/P0-08 remain complete:** the capability matrix and initial semantic/toolchain strategy are updated for the new findings.
- **P0-07 blocked; P0-EXIT remains open:** the Tauri `2.9.2` candidate falls within a direct advisory's affected range; no application manifests or lockfiles exist, and selected runtime artifacts still lack verified digests or compatibility evidence.

### Work and decisions

- Expanded [phase 0 audit findings](docs/plan/phase-0-audit-findings.md) with the selected language-server release's entry-only cancellation checks and failure/recovery limits; explicitly separated Phase 1 supervisor restart/resynchronization from upstream server behavior.
- Recorded that the pinned `nf-lang` parse/analyze API does not resolve effective runtime configuration, may use service-loaded remote module resolution with download/install effects, and does not guarantee exact source-edit ranges. These limitations now have conservative architecture dispositions rather than speculative capability claims.
- Resolved the P0-04 form policy: identify schema dialect/provenance, distinguish declared metadata from official validation/effective values, avoid automatic dialect conversion, and do not execute plugins or inspect files on project open. Documented the nf-schema migration guide versus nf-core/tools compatibility discrepancy.
- Updated the editor decision to the documented stable Monaco `0.55.1` / monaco-languageclient `10.7.0` / Codingame `25.1.2` set, while keeping production Tauri workers/CSP and the IPC-to-stdio bridge in the Phase 1 spike.
- Rejected Tauri `2.9.2` for Windows/Android based on [GHSA-7gmj-67g7-phm9](https://github.com/advisories/GHSA-7gmj-67g7-phm9), which identifies `2.11.1` as the first patched version. The GitHub advisory database tool returned no vulnerabilities for the queried set; the direct versioned advisory conflicts with that result and is documented as controlling until reconciled.
- Added selected npm package SRI records, upstream dependency declarations, and runtime roles. The language-server JAR digest and nf-schema `2.8.0` compatibility remain unverified; without app manifests/lockfiles the actual transitive graph and resolved runtime/development split cannot be established.
- Updated the tracker and phase-0 capability matrix; P0-EXIT is intentionally not checked because P0-07 remains blocked.

### Validation

- Reviewed version-pinned upstream source/test references and retrievable registry metadata; the GitHub advisory response confirms Tauri `2.0.0`–`2.11.0` affected and `2.11.1` first patched for the cited advisory.
- The GitHub advisory database tool returned no vulnerabilities for the submitted versions; direct GHSA evidence conflicts, so no clean Tauri conclusion is claimed.
- Confirmed the repository has no package/Cargo/Gradle manifests or lockfiles; no application tests/build/lint apply. Upstream tests were inspected, not run.
- Local whitespace, internal Markdown links/anchors, and secret scanning passed. CodeQL ran after the documentation commit and skipped the changes as trivial; no application test/build/lint applies.

### Limitations and next steps

- **P0-07/P0-EXIT:** verify the exact replacement Tauri release/artifact and frontend API pair, verify the language-server JAR checksum/attestation, resolve nf-schema's Nextflow-minimum discrepancy, and create real manifests/lockfiles before auditing the resolved dependency graph.
- **Phase 1:** prove packaged Monaco workers under actual Tauri CSP, IPC-to-stdio LSP transport, supervisor restart, document resynchronization, cancellation, and diagnostic recovery.
- **Phases 2/3:** define the supported visual-edit subset and test exact parser ranges and source-preserving edit round trips; retain opaque treatment of plugin calls absent official signatures.

## 2026-11-17 21:50 UTC — P0-01/P0-03 test and range audit

### Tasks/status

- **P0-01/P0-02 progressed:** compared selected language-server `v26.04.4` evidence with newer server-main tests and pinned editor lifecycle code. Neither task is complete.
- **P0-03 progressed:** documented parser source-position/test coverage, plugin placeholders, and parser API stability limits. Neither P0-03 nor P0-04 is complete.
- **P0-06 evidence refined:** the matrix now distinguishes selected-release guarantees from behavior tested only on newer `main`.

### Work and decisions

- Extended [phase 0 audit findings](docs/plan/phase-0-audit-findings.md) with version-pinned evidence for incomplete-source diagnostics, cancellation, stale/versioned results, failure containment, internal recovery, and editor restart behavior.
- Confirmed that the `v26.04.4` incomplete-source test is narrow and its inspected diagnostic publisher omits document versions. Newer language-server commit `126aaafbdf3cccb00c965e51495dad63f9930c23` has materially stronger cancellation, freshness, and failure-recovery tests; these do not establish those guarantees for the selected release.
- Recorded that the official extension at `1a28fdb18f435a7e62606e89623e753a2301e786` exposes manual and configuration-driven server restart, but no process-crash restart and buffer-resynchronization test was found.
- Recorded that Nextflow `v26.04.6` AST positions and parser tests do not establish exact source-preserving edit ranges for the proposed GUI subset. Plugin calls remain opaque for signature-dependent edits; public parser entry points lack a versioned compatibility guarantee.
- Updated the capability matrix and work-status rows to reflect the evidence and keep the affected tasks in progress.

### Validation

- Reviewed the cited upstream implementation/test pages and pinned source references; the linked language-server and parser test pages were retrievable.
- This was source/test inspection only. No upstream test suites were run.
- No application test, build, or lint suite applies; the repository contains planning documentation only.
- Local whitespace and secret checks passed; local links were reviewed. CodeQL ran after the documentation commit and skipped the changes as trivial.

### Limitations and next steps

- **P0-01/P0-02:** validate cancellation and failure behavior for the selected server release and prove process restart, buffer resynchronization, and diagnostic recovery in the phase-1 integration spike.
- **P0-03:** define the supported editable subset and prove exact ranges plus source-preserving round trips for each supported parser version; continue parser initialization side-effect review.
- **P0-04:** decide parameter-form behavior across nf-schema and nf-core schema dialects.
- **P0-05/P0-07:** finish the remaining desktop/editor integration, transitive dependency, and provenance decisions.
- **P0-EXIT** remains blocked, and no new task is checked complete.

## 2026-09-18 14:16 UTC — Phase 0 capability matrix and baseline selection

### Tasks/status

- **P0-06 complete:** added the versioned capability matrix covering standard requests, custom commands, payload shapes, unsaved buffers, cancellation, stale results, cross-file resolution, supported syntax, and semantic/editing gaps.
- **P0-08 complete:** selected the managed toolchain baseline and documented how each initial-release feature obtains semantics and performs edits.
- **P0-01/P0-03/P0-05/P0-07 remain in progress:** the phase still needs stronger request/test coverage, editable-subconstruct proof, final provenance follow-up, and the planned Monaco integration spike before phase exit can close.

### Work and decisions

- Added [docs/plan/phase-0-capability-matrix.md](docs/plan/phase-0-capability-matrix.md) to record the selected baseline, rejected alternatives, the server capability matrix, and the feature-to-semantics/edit-path matrix for the initial release boundary.
- Clarified that the managed Nextflow floor (`26.04.3+`) applies to app-managed tooling and audit baselines, not as a forced upgrade requirement on every repository the user opens.
- Chose a conservative stable editor compatibility line (`monaco-editor` `0.55.1`, `monaco-languageclient` `10.7.0`, `@codingame/monaco-vscode-api` `25.1.2`) instead of the currently unreleased Monaco bridge line, while keeping the Monaco worker/CSP proof explicitly deferred to phase 1.
- Recorded that Java 17+ remains the current phase-0 prerequisite and that bundled or managed Java distribution is still a later packaging decision rather than a closed upstream-audit fact.
- Added explicit matrix rows for project language-line handling and JSON Schema dialect mismatch so future work distinguishes upstream semantic gaps from implementation work that is merely not built yet.

### Validation

- Manually reviewed the new matrix document, links, and tracker/changelog updates for consistency with the phase 0 findings.
- No repository test, build, or lint command exists yet; this repository still contains planning documents only.
- Secret scanning passed on the changed planning files.
- Parallel validation ran after the matrix update. CodeQL correctly skipped the trivial docs-only change. The automated review step returned no review comments, but also emitted a model-availability warning, so automated review availability remains partially limited in this environment.

### Limitations and next steps

- **P0-EXIT** remains blocked on stronger P0-01 invalid/incomplete-source and cancellation evidence, stronger P0-03 editable-range proof, and the deferred phase-1 Monaco integration spike.
- Continue with the remaining P0-01/P0-03/P0-05/P0-07 blockers and keep the selected baseline pinned in any future manifests or spikes unless new upstream evidence forces a change.

## 2026-09-18 13:33 UTC — Phase 0 initial upstream audit

### Tasks/status

- **P0-01 in progress:** verified the current language-server transport, advertised capabilities, and custom commands against upstream code and docs.
- **P0-02 in progress:** verified the official editor integration repository, startup path, cache/download behavior, recovery hooks, and graph/workspace command usage; corrected the stale repository reference in the phase plan.
- **P0-03 in progress:** recorded initial Nextflow strict-parser, loader, and runtime DAG evidence relevant to a thin adapter decision.
- **P0-04 in progress:** recorded initial nf-schema and typed-parameter findings and their limits for parameter-form work.
- **P0-05/P0-07 in progress:** captured initial version/license candidates plus immediate risks for Tauri and Monaco integration; full advisory/transitive audit remains open.
- **P0-06/P0-08 in progress:** documented first-pass feature-to-semantics implications, but not the final capability matrix or phase exit proof.

### Work and decisions

- Added [docs/plan/phase-0-audit-findings.md](docs/plan/phase-0-audit-findings.md) as the first evidence-backed phase 0 findings log, with version baselines, per-task findings, architecture implications, and remaining blockers.
- Updated [docs/plan/phase-0-upstream-audit.md](docs/plan/phase-0-upstream-audit.md) to link the new findings file and to correct the official VS Code extension source from the stale `nextflow-io/vscode-nextflow` URL to `nextflow-io/vscode-language-nextflow`.
- Verified from upstream code/docs that the Nextflow language server is a stdio LSP server with incremental document sync and editor-specific commands for DAG/workspace previews and typed-script conversion.
- Verified that the current extension downloads or reuses version-matched language-server binaries from `~/.nextflow/lsp`, requires Java 17+ unless a native binary is already present, and augments some project-view data outside the language server (`.nf.test` regex parsing).
- Verified that strict-parser behavior in Nextflow 26.04+ is a key semantic baseline, that `nf-lang` provides a real parse/analyze path with AST positions, and that core loaders still sit close to runtime execution and plugin/module side effects.
- Verified that `plugin/...` includes are currently unresolved placeholders in core strict parsing, that remote-module resolution can hit registries/download/install paths, and that runtime `-with-dag` output is not equivalent to the editor's preview path.
- Verified that `nf-schema` is effectively JSON Schema 2020-12 only today with custom Nextflow evaluators, while nf-core tooling still spans older and newer schema dialects and should not be treated as a single authoritative metadata source.
- Recorded dependency and supply-chain follow-up findings: Tauri plus `@tauri-apps/api` remain viable with packaging/security caveats, `@xyflow/react` looks acceptable, the Nextflow language server and nf-schema should be treated as pinned external runtime artifacts, and the current Monaco decision is blocked on `monaco-editor` `0.56.0` only aligning with unreleased `monaco-languageclient` `11.0.0-next.3`.
- Recorded an immediate frontend risk: the TypeFox compatibility table aligns `monaco-editor` `0.56.0` with unreleased `monaco-languageclient` `11.0.0-next.3`, while the latest stable listed line is older (`10.7.0` with `monaco-editor` `0.55.1`).

### Validation

- Manually reviewed the new audit links and repository-reference correction in the updated plan documents.
- No repository test, build, or lint command exists yet; this repository currently contains planning documents only.
- Required automated review/security tooling remains to be run for this documentation change before phase-0 work is finalized.

### Limitations and next steps

- This is still partial phase 0 evidence, not a completed audit or approved dependency matrix.
- Remaining work should focus on **P0-01/P0-03** test and source-range coverage, unresolved plugin semantics, **P0-04** schema-dialect handling, finishing **P0-05/P0-07** transitive/provenance decisions around the Monaco/Tauri path, and then the full **P0-06/P0-08** capability matrix.
- No phase 0 task is checked complete yet, and **P0-EXIT** remains blocked on missing matrix and validation evidence.

## 2026-09-18 — Planning foundation

### Tasks/status

- **DOC-01 complete:** preserved the initial plan in a root overview and eight
  linked phase files (commit `a25b059`).
- **DOC-02 complete:** added the task tracker, this changelog, and mandatory
  reporting references in the main plan and every phase.
- **P0–P7 not started:** no upstream audit, implementation, or execution
  capabilities are being claimed as complete.

### Work and decisions

- [PLAN.md](PLAN.md) establishes source authority, the proposed architecture,
  initial-release boundaries, and links to phase requirements.
- Phase documents preserve integration alternatives, candidate dependency
  rationale, security requirements, validation strategy, and decision gates.
- [PLAN_TRACKING.md](PLAN_TRACKING.md) separates completed planning from pending
  research/implementation with stable task IDs and evidence-backed exit gates.
- Reporting is required at both the main entry point and each phase entry point
  so agents opening a phase directly receive the same instructions.

### Validation

- Initial plan commit: secret and whitespace checks passed; navigation and
  coverage were manually reviewed. Automated code review was unavailable due to
  a model configuration error; CodeQL skipped documentation-only changes.
- Tracker/reporting changes: secret and whitespace checks passed; task IDs were
  checked for duplicates (none found), local links/anchors and phase coverage
  were manually reviewed, and only completed planning tasks are checked.
- Automated review was attempted but unavailable due to a model configuration
  error. CodeQL skipped these documentation-only changes. No application tests
  apply; the repository has no application or documentation test suite.

### Limitations and next steps

- The plan remains a proposal: live upstream source/documentation research has
  not been verified, and dependencies have not been selected or installed.
- Begin **P0-01** with the official language-server audit and record evidence
  before checking research or implementation tasks complete.
