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
- Secret scanning and parallel validation must be re-run after this matrix update before the current change set is finalized.

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
