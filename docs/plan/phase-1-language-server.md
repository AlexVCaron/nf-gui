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
supports timed receive, exit polling, and termination. A dedicated stdin writer
uses a bounded queue so command handlers never block while writing a full child
pipe; queue saturation reports backpressure, and a writer failure terminates the
session. Narrow Tauri commands start, send, and stop one session. IPC carries
JSON-RPC bodies, while the frontend adapter removes/adds `Content-Length`
framing at that boundary; stderr bytes remain separate. Closing the window
terminates the child. Startup resolves only the bundled
`artifacts/language-server-all.jar`, verifies its pinned SHA-256 and regular-file
status, then launches fixed `java -jar` with a cleared environment except for
`PATH`. No executable or JAR path comes from the frontend.

The typed client uses the pinned `@tauri-apps/api` `2.12.5` package and Tauri
Rust crate `2.12.7`; the GitHub advisory database reported no findings for the
updated API, CLI, and Rust crates. The API-to-Rust pairing has now passed a
native Linux build. The PoC UI has explicit connect/stop controls, and the
editor session owns an authoritative model registry keyed by document URI. It
opens each model once, synchronizes advertised full or incremental changes with
that model's version, closes only the matching model, and routes diagnostics,
hover, and completion to registered models. Reopening one model is idempotent;
opening a different model at an already-open URI is rejected. The UI now has a
native folder picker and bounded `.nf` source discovery, an explorer for
switching between in-memory Monaco models, and workspace-root initialization
for the language server. On Unix, reads are rooted at a held directory handle,
reject symlinks in every component, and use nonblocking opens for final files;
workspace loading is disabled on non-Unix platforms until equivalent
handle-safe traversal is available. Selecting another document opens it in the
current LSP session. This is not yet a full workspace lifecycle: edits are not
saved, external changes are not watched, and rename/delete flows are not
implemented.
The folder picker uses its callback API, and workspace discovery runs on a
blocking worker rather than holding the window event loop. The editor hover
provider includes any LSP diagnostic covering the hovered position alongside
server-provided hover content, including when the server does not return hover
content. This behavior is implemented but still needs native Codespaces
verification following the user's report that diagnostic hovers were absent and
opening a project froze the window.
Protocol framing, document lifecycle/sync, completion
normalization, request correlation, cancellation, timeout, write ordering, and
closure have focused tests. Outbound JSON-RPC frames are serialized so edits
reach the server in document-version order. Failed synchronous or asynchronous
document-change sends fail the session and prevent later incremental updates
from being sent against an unsynchronized version. An explicit Tauri exit
channel tears down all editor providers and markers when the child stops
unexpectedly and lets the UI offer a retry. Connect/stop operations are
serialized, and the control remains disabled while shutdown is in progress.
Startup checks for a process exit after both transport startup and document open,
and the UI confirms the returned session is still active before marking it
connected.
Versioned `publishDiagnostics` notifications are ignored unless they match the
current Monaco model version. Hover and completion responses are discarded if
the model changes while their request is in flight. The frontend suite has
25 passing tests, including IPC framing conversion and synchronous/asynchronous
document-send failure handling; 17 Rust tests pass, including bounded writer
backpressure and child termination.

The JAR is intentionally not committed or downloaded automatically. The local
experiment instructions in [the PoC README](../../poc/README.md) show how to
stage the already-pinned release for packaging. A direct JAR initialize/shutdown
exchange passed, and the native Ubuntu build and virtual-display app launch
passed. The adapter has not yet been exercised against the real server through
the Tauri UI: Connect/Stop, diagnostics, hover, and completion were subsequently
confirmed by the user in Codespaces for the single-buffer version. The new
workspace picker/multi-document changes have not yet been validated through a
fresh native build or real-server UI session. Workspace file lifecycle,
process-tree management, restart recovery, cross-file behavior, and the full
Monaco feature set remain unproven.

### Validation delivery: headless CI and Codespaces

Plan repeatable, headless validation in GitHub Actions for frontend tests/build,
Rust tests with Tauri's native Linux prerequisites, and integrity checks for
the pinned server artifact. A real-server integration job should download only
the exact pinned release, verify its SHA-256, and test the protocol lifecycle;
do not commit the JAR or bypass its runtime verification.

The next environment task prioritizes a reproducible Linux GitHub Codespace for
interactive testing of the actual Tauri application. Check in a devcontainer
configuration and bootstrap/launch scripts that provide the Node.js toolchain
required by the lockfile, Rust/Cargo, the Java runtime required by the pinned
language server, Tauri's Linux build libraries, and the X11/window-manager and
noVNC components needed for a remote desktop. Keep setup idempotent and make
missing prerequisites or an invalid/missing staged server artifact fail with
actionable errors. Stage only the exact pinned JAR and verify its SHA-256; do not
commit it or bypass runtime verification.

Configure a shared display for Tauri-launched processes and a simple command to
start the display services and app. Forward the noVNC web port privately through
Codespaces; bind raw VNC locally, do not forward its port, and do not place
credentials in repository configuration. Document how to open the Codespace
from the PR branch and verify the intended commit before testing. Forwarding
only the Vite browser page is not sufficient to validate Tauri IPC.

Codespaces is the prioritized human-review path, not a replacement for
headless GitHub Actions tests or a claim of platform support. Validate a fresh
Codespace through dependency installation, frontend and Rust tests, native
Tauri build/launch, and real-server Connect/Stop, diagnostics, hover, and
completion checks. Keep uncompleted checks and any environment-specific
limitations explicit.

### P1-07 — Reproducible Linux Codespaces environment

Add repository-owned Codespaces configuration and scripts for the dependencies,
artifact staging/integrity check, display setup, and Tauri launch described
above. Verify that a newly created Codespace can run the documented setup
without manual installation of missing Rust/Cargo or native build libraries.
Keep interactive remote desktop access private and keep the headless test path
independent.

### P1-08 — Codespaces end-to-end validation

From the intended PR revision, verify the commit SHA, run setup, tests, and a
native Tauri build, then exercise the pinned server through the real UI. Record
the exact checks and results in the tracker. Validate Connect/Stop, diagnostics,
hover, completion, and failure/retry behavior; do not mark complete based only
on a browser dev server or successful build.

### P1-02 — Monaco bridge compatibility checkpoint

The current frontend uses `monaco-editor` `0.57.0` directly, without VS Code
services. Monaco's public `languages` API exposes providers for completion,
hover, definitions, references, rename, and document symbols, and its editor
API exposes model markers for diagnostics. Tauri 2's IPC channels support
ordered Rust-to-frontend message delivery. These APIs allow a small
project-owned adapter between the Rust LSP process and Monaco without exposing
a local network port.

The PoC now prototypes that adapter for one sample buffer: it negotiates server
capabilities, synchronizes edits, maps published diagnostics to Monaco markers,
and registers completion and hover only when advertised. Completion results
preserve supported labels, kinds, insertion text/snippets, text edits,
documentation, and incomplete-list state; the initialize request advertises
snippet and documentation-format support, and malformed list items are ignored.
It remains in progress until tested with the pinned server through the native
Tauri UI; cancellation, disposal, and document-version handling also require
end-to-end verification.

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
