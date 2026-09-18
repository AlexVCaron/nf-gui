# Plan task tracker

[Main plan](PLAN.md) · [Changelog](CHANGELOG.md)

This is the authoritative task-status checklist; the phase documents remain the
detailed requirements. Planning documentation is complete, but upstream research
and implementation have not started. Writing a plan does not complete its tasks.

## Required reporting workflow

For every task worked on, including partial progress, blocked work, and reopened
tasks, update **this file and [CHANGELOG.md](CHANGELOG.md) in the same change**
as the work. Follow the [main plan reporting requirements](PLAN.md#required-progress-reporting).

- Keep task IDs stable; reference them in changes, evidence, and changelog entries.
- `[ ]` means not complete. Use the work-status table below to distinguish
  in-progress, blocked, and deferred work from work not yet started.
- Mark `[x]` only when the task's requirements and relevant validation pass.
  Link evidence in the work-status table: source changes, research findings,
  upstream version/commit references, test results, or review records.
- Unavailable validation is not a pass. Record the limitation and leave tasks
  requiring that validation unchecked.
- For conditional work, record the evaluated decision and evidence. A task to
  *decide* may complete with “not needed”; do not mark unimplemented features
  complete merely because they were deferred.
- Check a phase's exit gate only after its required tasks and documented exit
  criterion are satisfied. Security and validation apply throughout all phases.
- If scope changes, update the affected phase and this checklist together,
  retain existing IDs, and explain additions, deferrals, or reopened work in
  the changelog. Do not silently remove unfinished tasks.

## Planning foundation

- [x] DOC-01 — Preserve the initial architecture, constraints, dependency rationale,
  research caveats, and phases in the main plan and eight phase documents.
- [x] DOC-02 — Add this tracker, the initial changelog, and required reporting
  links at the main and phase entry points.

## Phase 0 — Upstream audit

[Detailed requirements](docs/plan/phase-0-upstream-audit.md)

- [ ] P0-01 — Audit language-server source, tests, capabilities, lifecycle, and
  standard/custom protocols; cite documentation and implementation evidence.
- [ ] P0-02 — Audit the official editor integration, server provisioning,
  configuration, custom requests, graph features, and compatibility assumptions.
- [ ] P0-03 — Audit Nextflow parser/compiler APIs, source ranges, module resolution,
  language semantics, configuration resolution, and initialization side effects.
- [ ] P0-04 — Verify parameter/schema dialects, nf-schema extensions, samplesheets,
  and the authority and limits of nf-core metadata.
- [ ] P0-05 — Verify Tauri permissions/packaging and editor transport, worker,
  CSP, WebView, and client compatibility requirements.
- [x] P0-06 — Produce the versioned capability matrix, including unsaved buffers,
  cancellation, stale results, cross-file resolution, and semantic/editing gaps.
- [ ] P0-07 — Resolve candidate dependency choices and alternatives; record exact
  versions, licenses, advisories, provenance, transitive exposure, and runtime
  versus development roles.
- [x] P0-08 — Select compatible Java/server/parser/Nextflow combinations and
  document how each initial feature obtains semantics and performs edits.
- [ ] P0-EXIT — Verify the phase 0 exit criterion with linked audit evidence.

## Phase 1 — Language-server integration

[Detailed requirements](docs/plan/phase-1-language-server.md)

- [ ] P1-01 — Establish Tauri-to-server transport and supervised server lifecycle.
- [ ] P1-02 — Prove the editor integration and select the smallest viable bridge.
- [ ] P1-03 — Synchronize one authoritative, versioned buffer per open document
  across editor, server, adapter if needed, and visual transactions.
- [ ] P1-04 — Display official diagnostics and verify supported navigation,
  completion, hover, and rename behavior on cross-file projects.
- [ ] P1-05 — Handle clean reloads, dirty-buffer conflicts, renames, deletions,
  module moves, duplicate watch events, and atomic saves without losing work.
- [ ] P1-06 — Handle incomplete source, stale analysis, cancellation, restarts,
  and version mismatches while keeping text editing available.
- [ ] P1-EXIT — Demonstrate reliable language intelligence for unsaved buffers
  and cross-file projects under the phase's security and recovery requirements.

## Phase 2 — Structural extraction

[Detailed requirements](docs/plan/phase-2-structural-extraction.md)

- [ ] P2-01 — Evaluate supported server APIs first; document whether a thin
  official-parser adapter is needed and the selected integration strategy.
- [ ] P2-02 — Deliver the selected extraction path, implementing an adapter only
  if needed, without adding an independent parser or semantic engine.
- [ ] P2-03 — Define the disposable, versioned projection with source identities,
  ranges, references, available types, diagnostics, and supported operations.
- [ ] P2-04 — Distinguish definitions, invocation instances, inputs, outputs,
  parameters, directives, operators, configuration, and UI-only properties.
- [ ] P2-05 — Render workflow boundaries, invocations, explicit connections,
  resolvable outputs/operators, module provenance, and source navigation.
- [ ] P2-06 — Expose dynamic, unresolved, unsupported, and stale regions without
  implying runtime knowledge or a complete graph.
- [ ] P2-EXIT — Reproduce source-backed structure from official analysis across
  representative fixtures, without a second language model.

## Phase 3 — Visual editing

[Detailed requirements](docs/plan/phase-3-visual-editing.md)

- [ ] P3-01 — Implement version-checked, minimal source-edit transactions,
  coordinated multi-file application, reanalysis, and coherent undo/redo.
- [ ] P3-02 — Preserve comments, formatting, expressions, aliases, configuration,
  and unsupported source; reject stale or unsafe operations.
- [ ] P3-03 — Support literal parameter changes.
- [ ] P3-04 — Support binding existing values/expressions to known inputs and
  rebinding inputs to resolvable outputs.
- [ ] P3-05 — Support rename through verified official rename capabilities.
- [ ] P3-06 — Support invocation insertion, resolvable includes/imports, and
  invocation removal with reference checks in the documented safe subset.
- [ ] P3-07 — Resolve formal-input/argument and output/consumer associations
  through official semantics, not graph labels or synchronous-call assumptions.
- [ ] P3-08 — Support schema-aware parameter fields and distinct literal,
  parameter-reference, output-reference, and expression modes without evaluation.
- [ ] P3-09 — Preserve value origins and defaults; distinguish local schema
  checks from official validation and declared from resolved configuration.
- [ ] P3-10 — Explain unsupported edits, provide source fallback, and treat
  definition/signature changes as separate workspace-wide operations.
- [ ] P3-EXIT — Pass round-trip tests for supported edits, source preservation,
  stale versions, unsaved buffers, multi-file atomicity, undo, and recovery.

## Phase 4 — First usable application

[Detailed requirements](docs/plan/phase-4-usable-application.md)

- [ ] P4-01 — Integrate existing-project opening and the source editor.
- [ ] P4-02 — Integrate workflow canvas, definition/invocation inspector, and
  module/include navigation.
- [ ] P4-03 — Integrate official diagnostics, navigation, and basic parameter forms.
- [ ] P4-04 — Document and expose the safe visual-editing subset, undo/redo,
  external-change handling, and view-only/source fallback.
- [ ] P4-05 — Display compatibility and unsupported-construct indicators and
  preserve the documented initial-release boundaries.
- [ ] P4-EXIT — Demonstrate inspection and supported editing of real pipelines
  while projects remain usable with ordinary Nextflow source and tools.

## Phase 5 — Compatibility, security, validation, and packaging

[Detailed requirements](docs/plan/phase-5-compatibility-packaging.md)

These controls and tests begin with the first integration spike, not at release.

- [ ] P5-01 — Enforce separate trust for file reading, analysis, downloads,
  evaluation-dependent validation, and execution; audit initialization effects.
- [ ] P5-02 — Scope native commands/filesystem access, including symlink handling,
  and prevent arbitrary frontend shell execution.
- [ ] P5-03 — Supervise processes with direct arguments, controlled directories
  and environments, separate protocol/log streams, limits, and tree cleanup.
- [ ] P5-04 — Safely render untrusted content, restrict external links, redact
  logs/support bundles, and avoid persisting sensitive values.
- [ ] P5-05 — Provision compatible toolchains with verified, permissioned
  downloads, offline behavior, and compatibility warnings.
- [ ] P5-06 — Maintain a licensed representative fixture corpus and official-tool
  comparisons for supported toolchain combinations.
- [ ] P5-07 — Validate all supported source-edit round trips and semantic outcomes.
- [ ] P5-08 — Exercise protocol/server/JVM failures, interrupted downloads,
  external file races, large/cyclic workspaces, Unicode paths, and recovery.
- [ ] P5-09 — Test trust, filesystem, injection, secrets, download, and execution
  boundaries, including proof that opening a project does not run its pipeline.
- [ ] P5-10 — Produce supported-platform builds, signed releases, supply-chain
  inventory, and a documented update policy before enabling updates.
- [ ] P5-11 — Validate clean-machine installation, offline use, crash recovery,
  and remaining compatibility/risk decisions.
- [ ] P5-EXIT — Demonstrate installation and use without undocumented development
  prerequisites and with the required security/validation evidence.

## Phase 6 — Optional execution

[Detailed requirements](docs/plan/phase-6-execution.md)

- [ ] P6-01 — Add explicitly approved run configuration and parameter-file handling.
- [ ] P6-02 — Add runtime logs, cancellation, and execution process cleanup.
- [ ] P6-03 — Audit graph/report command side effects and expose supported runtime
  views separately from the static source graph.
- [ ] P6-04 — Add optional environment/container integration without making
  Nextflow execution, containers, or Conda prerequisites for editing.
- [ ] P6-05 — Show effective configuration only when officially resolved for the
  selected context; enforce trust for every evaluation-dependent action.
- [ ] P6-EXIT — Verify execution is permissioned, separate, and unnecessary for
  ordinary editing; keep remote execution and cloud credentials out of scope.

## Phase 7 — Expansion and upstream contributions

[Detailed requirements](docs/plan/phase-7-expansion.md)

- [ ] P7-01 — Identify and justify the next editing subset only after foundational
  semantic and source-editing proofs; add stable task IDs for approved scope.
- [ ] P7-02 — Implement and round-trip-test that subset against official semantics,
  preserving source authority, compatibility, and conservative fallback.
- [ ] P7-03 — Evaluate broadly useful missing upstream APIs; record proposals,
  contribution links, or evidence that no contribution is needed.
- [ ] P7-04 — Record integration/maintenance decisions, keeping forks a last
  resort and avoiding automatic adoption of deferred features.
- [ ] P7-EXIT — Verify approved expansion preserves the established invariants
  and records upstream outcomes or outstanding external blockers.

Upstream work may begin earlier alongside adapter development. An external
proposal is not evidence that a capability has shipped.

## Work status and evidence

Keep one current row per task being worked on or completed. For new work, record
the task ID, status, evidence/results, blockers, and next action. Preserve the
history of status changes in the changelog rather than accumulating stale rows.
Tasks without a row and with an unchecked box are not started.

| Task IDs | Status | Evidence and validation | Blockers / next action |
|---|---|---|---|
| DOC-01 | Complete | [Main plan](PLAN.md), linked phase documents, and commit `a25b059`; original research limitation retained. | Begin P0-01; upstream claims remain unverified. |
| DOC-02 | Complete | This checklist, [initial changelog and validation outcomes](CHANGELOG.md#2026-09-18--planning-foundation), and reporting references in all phases; secret/whitespace and duplicate-ID checks passed, links manually reviewed. | Automated review unavailable (model configuration); CodeQL skipped documentation-only changes. Use both reporting files for subsequent work. |
| P0-01, P0-02 | In progress | [Initial phase 0 audit findings](docs/plan/phase-0-audit-findings.md) capture verified language-server and editor-integration evidence: stdio transport, incremental sync, advertised capabilities, custom commands, cache/download behavior, Java 17 requirement, recovery hooks, and the extension-repo rename. Validation pending for upstream tests and failure-path coverage. | Review upstream tests and error/restart behavior before checking either task complete. |
| P0-03, P0-04 | In progress | [Initial phase 0 audit findings](docs/plan/phase-0-audit-findings.md) now cover strict-parser ADR and `nf-lang` evidence, real AST/source positions, eager local include resolution, unresolved `plugin/...` placeholder semantics, remote-module side effects, typed-parameter runtime behavior, nf-schema's 2020-12-only validator/extensions, and nf-core schema/meta mismatches. Current evidence supports the architecture direction but still leaves gaps around stable public APIs, exhaustive editable sub-ranges, and exact plugin semantics. | Audit parser/compiler test coverage for editable constructs, determine safe handling for unresolved plugin includes, and decide how parameter UX will handle nf-schema vs nf-core dialect differences. |
| P0-05, P0-07 | In progress | [Initial phase 0 audit findings](docs/plan/phase-0-audit-findings.md) now include candidate versions, licenses, role recommendations, provenance notes, and advisory outcomes for Tauri, `@tauri-apps/api`, Monaco, monaco-languageclient, React Flow, the Nextflow language server, and nf-schema. Current blockers are the Monaco/editor-bridge version mismatch, Tauri Linux runtime caveats, and the need to treat Nextflow tooling as managed runtime artifacts rather than ordinary frontend dependencies. | Finish transitive/provenance review and choose whether to downgrade Monaco to a stable compatible line or explicitly accept prerelease bridge risk. |
| P0-06, P0-08 | Complete | [Phase 0 capability matrix and baseline selections](docs/plan/phase-0-capability-matrix.md) now document the selected managed toolchain baseline, the project-compatibility policy, the versioned capability matrix for the `26.04` language-server line, and the feature-to-semantics/edit-path mapping for the initial release boundary. Secret scanning passed. Parallel validation ran after the matrix update; CodeQL correctly skipped the docs-only change, while the review step returned no comments but also emitted a model-availability warning, so automated review availability remains partially limited. | Phase 0 exit is still blocked by P0-01/P0-03 evidence gaps and the phase-1 Monaco integration spike. |
