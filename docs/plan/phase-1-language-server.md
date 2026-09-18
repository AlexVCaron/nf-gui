# Phase 1 — Language-server and editor integration

[Main plan](../../PLAN.md) · [Previous: upstream audit](phase-0-upstream-audit.md) · [Next: structural extraction](phase-2-structural-extraction.md)

**Required reporting:** update [task status and evidence](../../PLAN_TRACKING.md#phase-1--language-server-integration)
and [CHANGELOG.md](../../CHANGELOG.md) for work on this phase, including partial
progress and blockers; follow the [reporting workflow](../../PLAN.md#required-progress-reporting).

## Objective and work

Prove the language-server integration:

- Establish Tauri-to-server communication.
- Open and synchronize documents.
- Display official diagnostics.
- Exercise navigation and rename capabilities.
- Test restart and version handling.

**Exit criterion:** official language intelligence works reliably with unsaved
buffers and cross-file projects.

Use the verified capability matrix from phase 0; standard LSP features must not
be assumed to be implemented by the selected server.

## Editor and document architecture

### Recommended editor: Monaco, subject to an integration spike

Reasons:

- IDE-oriented editing experience.
- Rich diagnostic and navigation surfaces.
- Familiar completion, rename, hover, and multi-file workflows.
- Strong suitability for a source-first development tool.

Monaco is not VS Code, and it does not automatically supply the official
extension’s behavior. Audit the integration cost before choosing a large
compatibility layer.

The dependency alternatives and bridge considerations are preserved in
[phase 0](phase-0-upstream-audit.md#d-source-editor).

### Document ownership

Maintain one authoritative in-memory buffer per open document.

That buffer must feed:

- The source editor.
- The language server.
- Any semantic adapter.
- Visual edit transactions.

Use monotonically increasing document versions.

### External file changes

Handle:

- Clean-buffer reloads.
- Dirty-buffer conflicts.
- File renames and deletions.
- Module moves.
- Duplicate filesystem events.
- Atomic-save patterns.

Never overwrite unsaved work merely because a watcher reports a disk change.

### Invalid source

Retain a last-known valid graph when useful, but clearly label it stale and
disable unsafe edits.

The text editor must remain usable when semantic analysis fails.

## Cross-cutting requirements

Apply the workspace trust, process supervision, protocol limits, logging, and
failure-recovery requirements from
[phase 5](phase-5-compatibility-packaging.md) from the beginning.
