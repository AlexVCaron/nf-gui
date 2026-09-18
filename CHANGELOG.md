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

## 2026-09-18 — Planning foundation

## 2026-09-18 — Phase 0 initial upstream audit

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
- Verified that strict-parser behavior in Nextflow 26.04+ is a key semantic baseline, that core loaders separate parse and run steps but stay runtime-adjacent, and that runtime `-with-dag` output is not equivalent to the editor's preview path.
- Recorded an immediate frontend risk: the TypeFox compatibility table aligns `monaco-editor` `0.56.0` with unreleased `monaco-languageclient` `11.0.0-next.3`, while the latest stable listed line is older (`10.7.0` with `monaco-editor` `0.55.1`).

### Validation

- Manually reviewed the new audit links and repository-reference correction in the updated plan documents.
- No repository test, build, or lint command exists yet; this repository currently contains planning documents only.
- Required automated review/security tooling remains to be run for this documentation change before phase-0 work is finalized.

### Limitations and next steps

- This is still partial phase 0 evidence, not a completed audit or approved dependency matrix.
- Remaining work should focus on **P0-01/P0-03** test and source-range coverage, **P0-05/P0-07** advisory/provenance/transitive review, and then the full **P0-06/P0-08** capability matrix.
- No phase 0 task is checked complete yet, and **P0-EXIT** remains blocked on missing matrix and validation evidence.

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
