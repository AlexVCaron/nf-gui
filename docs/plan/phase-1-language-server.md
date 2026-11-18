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

### Initial integration spike and deferred-risk boundary

P1-01 is the first active implementation task. The selected shape is a
Rust-supervised Nextflow language-server child process communicating over
stdio, with narrowly scoped Tauri commands/channels to the frontend. The server
uses standard LSP framing; do not introduce a frontend-accessible localhost
server, shell invocation, arbitrary executable path, or general filesystem
permission as a shortcut.

The initial Rust components now provide bounded `Content-Length` framing and a
child-process supervisor that invokes Java directly with `-jar`, pipes protocol
stdin/stdout, drains stderr into a separately bounded diagnostic queue, and
supports timed receive, exit polling, and termination. They are not yet wired to
a Tauri command/channel, do not implement LSP initialize/shutdown sequencing or
process-tree management, and do not resolve or verify a packaged server JAR.
Until those integrations and lifecycle tests exist, the prototype remains
non-functional as an LSP client.

### P1-02 — Monaco bridge compatibility checkpoint

The current frontend uses `monaco-editor` `0.57.0` directly, without VS Code
services. Monaco's public `languages` API exposes providers for completion,
hover, definitions, references, rename, and document symbols, and its editor
API exposes model markers for diagnostics. Tauri 2's IPC channels support
ordered Rust-to-frontend message delivery. These APIs allow a small
project-owned adapter between the Rust LSP process and Monaco without exposing
a local network port.

Do not add `monaco-languageclient` `10.7.0`: the upstream compatibility table
pairs that release with Monaco `0.55.1`. The same table lists `11.0.2` with
Monaco `0.56.0` and labels `11.0.3` (the row aligned with Monaco `0.57.0`) as
unreleased. Therefore no released exact match for the current editor is
established by that table. The project-owned Monaco-provider adapter is the
provisional smallest bridge candidate; keep P1-02 in progress until a prototype
proves diagnostics and at least one request/response feature against the
selected server, with protocol ordering, cancellation, disposal, and editor
version synchronization tests. Reassess the library option if a compatible
release is published and audited.

Evidence:

- [Monaco language API](https://microsoft.github.io/monaco-editor/typedoc/modules/editor_editor_api.languages.html)
- [monaco-languageclient compatibility history](https://github.com/TypeFox/monaco-languageclient/blob/main/docs/versions-and-history.md)
- [Tauri 2 JavaScript IPC channel API](https://v2.tauri.app/reference/javascript/api/namespacecore/)

The user accepted the currently documented npm/RustSec findings for internal
PoC/Phase 1 work only. This does not waive Phase 5 controls or imply a clean
audit. Keep the npm dev server loopback-only, retain the Tauri Windows/Android
upgrade gate, and re-audit any changed dependency graph. Before a release or
broader distribution, re-open P0-07 and disposition every risk in the
[Phase 0 register](phase-0-audit-findings.md#accepted-and-deferred-risks).
The nf-schema blob and Monaco language-client bridge remain deferred and must
not be downloaded, enabled, or treated as selected dependencies without their
documented provenance/advisory review.
