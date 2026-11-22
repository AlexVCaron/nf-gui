# Changelog

[Main plan](PLAN.md) · [Task tracker](PLAN_TRACKING.md)

This file records planning and implementation advancement, not just releases.
Update it alongside the tracker whenever working on plan tasks, including
partial progress, blockers, validation limitations, and reopened work.

## 2026-11-22 — Confirm Codespaces remote desktop access

### Tasks/status

- **P1-07 complete:** the user confirmed the Codespaces noVNC desktop path works.
- **P1-08 in progress:** native build/Rust tests and actual Tauri/LSP feature
  checks remain the next validation task.

### Work and decisions

- Updated the [tracker](PLAN_TRACKING.md) to record the user's confirmation
  that opening the forwarded noVNC service at `/vnc.html` reaches the viewer.
  The service root itself may show a normal noVNC static-file directory listing.
- Updated the [PoC instructions](poc/README.md#github-codespaces--linux-desktop-review)
  with the `/vnc.html` viewer path and clarified that remote desktop access does
  not establish the native build or language-server UI behavior.
- Kept P1-08 active rather than inferring Connect/Stop, diagnostics, hover, or
  completion results from the viewer-access confirmation.

### Validation

- User-reported: the Codespaces noVNC desktop viewer works when opened at
  `/vnc.html`.
- No code tests or builds were run for this documentation/status update.
- The prior local bootstrap, 27 frontend tests, frontend build, config checks,
  and secret scan remain recorded in the preceding changelog entry. Rust tests
  could not build on the local host due to missing GLib development libraries.

### Limitations and next steps

- In the working Codespace, verify the intended commit SHA; run frontend tests,
  build, Rust tests, and native Tauri build.
- Launch the app through the noVNC desktop and explicitly test Connect/Stop,
  diagnostics, hover, and completion. Record the observed results before
  completing P1-08.

## 2026-11-22 — Add Codespaces development environment

### Tasks/status

- **P1-07 in progress:** checked in the Linux Codespaces configuration and
  setup/desktop scripts. Local bootstrap, frontend tests, and build passed, but
  the fresh-Codespace image and interactive desktop remain unvalidated.
- **P1-08 planned:** real Tauri/LSP UI checks still require a fresh Codespace.

### Work and decisions

- Added `.devcontainer/Dockerfile` and `.devcontainer/devcontainer.json` for
  Ubuntu 24.04, Node.js 22, stable Rust/Cargo, Java 17, Tauri Linux build
  libraries, Xvfb/Openbox, VNC/noVNC, and a private forwarded noVNC port.
- Added `poc/scripts/codespace-setup.sh` to install with `npm ci`, fetch only
  the pinned Nextflow language-server release into a temporary staging
  directory, verify it, and then move it into the ignored artifacts directory.
  Added `--id` filtering to `verify-artifacts.mjs` so this check does not require
  the deferred nf-schema blob; tests cover selection and unknown IDs.
- Added `poc/scripts/codespace-desktop.sh` and npm commands to launch the Tauri
  app under a virtual display and local-only raw VNC behind noVNC. Documented
  exact-commit checking and the Codespaces setup/test/interactive-review path
  in `poc/README.md`.
- Updated P1-07 evidence and blockers in the [tracker](PLAN_TRACKING.md).

### Validation

- `bash poc/scripts/codespace-setup.sh` passed in the current host environment;
  it ran `npm ci` (zero reported npm vulnerabilities) and verified the staged
  10,015,752-byte JAR against its manifest SHA-256.
- `npm test` passed all 27 tests; `npm run build` passed with the existing
  Monaco chunk-size warning.
- Shell syntax checks, JSON parsing of `devcontainer.json`, and
  `git diff --check` passed.
- `cargo test --locked` did not complete on this host: the host lacks GLib
  development libraries (`gobject-2.0`/`glib-2.0` pkg-config files). The
  devcontainer declares GTK/WebKit dependencies to supply native requirements,
  but its image has not yet been built in Codespaces.
- No fresh Codespace, noVNC connection, native Tauri launch, or real-server UI
  interaction was tested. Secret scanning and CodeQL remain pending.

### Limitations and next steps

- P1-07 remains in progress until a fresh Codespace confirms image setup and
  Rust/Tauri prerequisites. Validate container package availability and adjust
  the configuration if needed.
- Complete P1-08 by running frontend/Rust tests and native build, then testing
  Connect/Stop, diagnostics, hover, and completion against the pinned server.

## 2026-11-22 — Prioritize GitHub Codespaces setup

### Tasks/status

- **P1-07 planned:** prioritize a checked-in, reproducible Linux Codespaces
  environment after the reported run showed Rust/Cargo was missing.
- **P1-08 planned:** validate a fresh Codespace at the intended PR commit,
  including the native Tauri UI and pinned language server.

### Work and decisions

- Updated the [Phase 1 plan](docs/plan/phase-1-language-server.md) to make
  Codespaces the prioritized interactive Linux testing path while retaining
  headless GitHub Actions as a separate requirement.
- Specified devcontainer/bootstrap and launch configuration for Node.js,
  Rust/Cargo, Java, Tauri Linux libraries, display/noVNC, private port
  forwarding, exact-commit verification, and SHA-256-checked JAR staging.
  Raw VNC must not be forwarded, and credentials must not be stored in repo
  configuration.
- Added stable P1-07/P1-08 tasks and evidence to the
  [tracker](PLAN_TRACKING.md#phase-1--language-server-integration). This change
  updates the plan only; no Codespaces files or scripts have been implemented.

### Validation

- No repository tests, builds, or Codespaces configuration checks were run;
  this change is planning documentation only.
- The user-reported Codespace run passed `npm ci`, all 25 frontend tests, and
  the pinned JAR checksum. It failed when invoking Cargo and `tauri dev` because
  `cargo` was not installed; these are user-provided results, not checks run in
  this change.

### Limitations and next steps

- Implement P1-07: add and validate the Linux devcontainer, dependencies,
  artifact staging/check, display startup, and Tauri launch scripts.
- Then complete P1-08 by testing from a fresh Codespace on the verified PR
  commit, including the native build and real-server Connect/Stop and language
  features. No end-to-end Codespaces result is available yet.

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

## 2026-11-20 — Address LSP integration review findings

### Tasks/status

- **P1-01 in progress:** isolated child-stdin writes behind a bounded queue so
  blocked writes cannot hold the session/process locks required for output
  handling or process termination.
- **P1-02 in progress:** corrected the JSON-RPC frame/body contract at the
  Tauri IPC boundary. The adapter now strips framing before sending bodies and
  restores framing for server responses.
- **P1-03/P1-06 in progress:** failed document-change sends now stop the session
  instead of allowing later deltas to use a server version known to be stale.
  Added guards against overlapping UI connect/stop operations and ensured
  unexpected-exit cleanup disposes completion as well as hover providers.

### Work and decisions

- `poc/src/lspProtocol.ts` exposes validated body extraction and frame
  construction. `poc/src/lspTransport.ts` uses these at the Tauri IPC boundary;
  JSON-RPC messages remain framed only on the process stdio side.
- `poc/src-tauri/src/lsp_process.rs` moves writes to a dedicated writer thread
  fed by a two-message bounded queue. `send()` is nonblocking and reports a
  full queue as backpressure; writer failures are forwarded to
  `lsp_ipc.rs`, which terminates the supervised session.
- `poc/src/App.tsx` serializes connect and stop operations, disables the action
  while connecting/stopping, and guards status updates by editor generation.
- `poc/src/lspDocumentSync.ts` catches both synchronous and asynchronous
  `didChange` failures, closes the synchronization session to further updates,
  and notifies the editor session to stop the server. `poc/src/lspEditor.ts`
  uses common cleanup for both hover and completion providers. No workspace or
  multi-file UI was added.
- Updated the [Phase 1 checkpoint](docs/plan/phase-1-language-server.md) and
  [tracker](PLAN_TRACKING.md) to record the fixes and retain the outstanding
  end-to-end/platform gaps.

### Validation

- `npm test` passed all 25 tests, including framed/body byte-preservation and
  synchronous/asynchronous document-send failure tests.
- `cargo test --locked` passed all 17 Rust tests, including bounded queue
  backpressure and terminating a child that does not read stdin.
- `npm run build` passed with the existing Monaco chunk-size warning.
- `npm run tauri -- build --no-bundle` passed on Ubuntu 24.04 x86_64; the
  existing Monaco chunk-size warning remains.
- `npm run audit:npm` reported zero vulnerabilities. The staged v26.10.2 JAR
  matched its pinned SHA-256.
- Rust formatting and `git diff --check` passed. Cargo dependency audit was not
  rerun because no dependencies changed; the three previously recorded RustSec
  findings remain deferred for the internal PoC/Phase 1 only.
- Actual server behavior through the Tauri UI was not exercised; macOS/Windows
  were not built. Secret scanning and CodeQL remain pending for this increment.

### Limitations and next steps

- Exercise the pinned server through the native Tauri UI and verify connect,
  stop, diagnostics, hover, completion, and failure/retry behavior.
- Validate the app on macOS and Windows before any platform-support claim.
- Keep P1 tasks in progress and P2 paused until the relevant integration and
  workspace proofs are complete.

## 2026-11-20 — Pin current language-server and Tauri baseline

### Tasks/status

- **P0-07 and P0-EXIT re-opened and re-audited:** the Tauri dependency graph
  changed materially and Cargo audit reports three denied RustSec findings.
  Their paths and platform exposure were checked; the existing deferral remains
  limited to internal PoC/Phase 1. Both tasks are complete for that non-shipping
  scope, not as a clean audit or release approval.
- **P1-01 in progress:** updated the Tauri baseline and compiled/started the app
  on Ubuntu, but the Connect/Stop UI-to-server flow remains unverified.
- **P1-02 in progress:** documented repeatable platform setup and the precise
  validation boundary; real-server behavior through the Monaco/Tauri UI remains
  outstanding.

### Work and decisions

- Pinned the Nextflow language-server artifact to `v26.10.2`; the release
  SHA-256 was independently verified. Updated Tauri to `2.12.7`,
  `tauri-build` to `2.7.6`, `@tauri-apps/api` to `2.12.5`, and
  `@tauri-apps/cli` to `2.12.6`. The Tauri update resolves the prior native
  dependency-interface compile failure and exceeds the documented
  GHSA-7gmj-67g7-phm9 fixed-version threshold.
- Mapped the Tauri stop-command exit status to unit for the updated API.
- Added Ubuntu, macOS, and Windows x64 setup steps to the [PoC
  README](poc/README.md), clearly marking Ubuntu as the only platform built
  here. Added PowerShell instructions to stage and hash-check the JAR on
  Windows; macOS and Windows remain unvalidated.
- Updated the [Phase 0 capability matrix](docs/plan/phase-0-capability-matrix.md),
  [dependency findings](docs/plan/phase-0-audit-findings.md), [Phase 1
  checkpoint](docs/plan/phase-1-language-server.md), and
  [task tracker](PLAN_TRACKING.md) to distinguish the historical v26.04.4
  capability audit from the v26.10.2 integration artifact and to record current
  findings.

### Validation

- The JAR SHA-256 matched the release digest; a direct LSP
  initialize/shutdown/exit exchange passed.
- `npm test` passed 22/22; `npm run audit:npm` reported zero vulnerabilities.
- `cargo test --locked` passed 16/16. `cargo fmt --all -- --check` and
  `git diff --check` passed.
- `npm run tauri -- build --no-bundle` passed on Ubuntu 24.04 x86_64, with the
  existing Monaco chunk-size warning. The built app launched under Xvfb and
  remained running until the 25-second timeout (exit 124); accessibility/EGL
  warnings appeared. No buttons were clicked, so this is not an interactive
  IPC test.
- `npm run audit:artifacts` verified the language-server JAR but failed on the
  intentionally unstaged `nf-schema-2.8.0.blob`.
- `cargo audit --deny warnings` failed on unmaintained `chrono`
  (`RUSTSEC-2026-0543`) and `proc-macro-error` (`RUSTSEC-2024-0370`), and
  unsound `glib` (`RUSTSEC-2024-0429`; fixed upstream at `>=0.20.0`). No fixed
  upgrade was reported for the two unmaintained crates. `cargo tree --target
  all` found no active path for `chrono`; `proc-macro-error` is reached through
  `glib-macros`, and the `glib`/GTK path is present in the Linux target tree but
  absent from the checked Windows/macOS target trees. No compatible standalone
  GLib 0.20 upgrade was identified for Tauri's current GTK stack. These findings
  remain deferred only for the already-approved non-shipping PoC/Phase 1 scope.
- macOS and Windows builds were not run. The actual JAR-backed Tauri UI flow,
  Connect/Stop controls, diagnostics, hover, and completion were not exercised.
  Secret scanning found no secrets in the changed files. CodeQL remains
  outstanding for this increment.

### Limitations and next steps

- Keep the explicitly deferred dependency findings outside any release/support
  claim; obtain a new risk disposition if the scope expands.
- Commit the paired tracker/changelog updates, then run CodeQL.
- Keep P1-01/P1-02 in progress until the pinned server is exercised through the
  Tauri UI. Validate macOS and Windows on their native platforms before
  claiming support; keep P2 paused.

## 2026-11-19 — Synchronize multiple open LSP documents

### Tasks/status

- **P1-03 in progress:** added per-URI model lifecycle/synchronization and
  capability-aware changes. The sample UI still opens one document; workspace
  integration and real-server validation remain pending.
- **P1-02 in progress:** diagnostics, hover, and completion now resolve against
  the registered document model.

### Work and decisions

- Added `poc/src/lspDocumentSync.ts` as the authoritative per-session registry.
  It sends didOpen once per model, sends only increasing-version changes,
  supports full and incremental sync, closes the exact model by URI, and rejects
  a different live model claiming an occupied URI.
- Exposed `openDocument`/`closeDocument` on the LSP editor session. Route
  diagnostics and provider requests through the matching registered model and
  clear markers across open models during cleanup.
- Added four focused tests for multiple URIs, idempotent opens, duplicate URIs,
  versioned edits, full/no-change capabilities, close notifications, and
  listener cleanup.

### Validation

- `npm ci` succeeded and reported zero vulnerabilities.
- `npm test` passed all 22 tests.
- `npm run build` passed with the existing Monaco chunk-size warning.
- `git diff --check` passed. The first test/build attempts failed before test
  execution because Node strip-only mode disallows TypeScript parameter
  properties and dependencies were not installed; both issues were corrected,
  then the tests and build passed.
- Secret scanning and CodeQL are not yet run for this increment. Native
  Tauri/server integration was not run; the pinned JAR is not staged and
  required Linux GLib/GIO development metadata is unavailable.

### Limitations and next steps

- Add workspace UI opening/closing flows and validate multi-document and
  cross-file behavior against the pinned server (P1-03/P1-04).
- Keep P2 paused. Continue headless Actions planning and native/remote-desktop
  reviewer delivery only after target runtime prerequisites are established.

## 2026-11-19 — Reject stale LSP results

### Tasks/status

- **P1-02 in progress:** added document-version guards for diagnostics, hover,
  and completion. This protects the single open buffer from delayed server
  responses; it does not complete multi-document synchronization (P1-03).

### Work and decisions

- Ignore `textDocument/publishDiagnostics` when its URI differs from the active
  model or its optional version is invalid/stale; retain support for valid
  versionless server notifications.
- Discard hover and completion responses when the editor model version changes
  while the corresponding request is pending, and reject provider calls for
  other model URIs.
- Added four dependency-free tests for matching/stale versions, URI mismatches,
  versionless diagnostics, malformed version values, and invalid payload shape.

### Validation

- `npm ci` succeeded; its audit reported zero vulnerabilities in this run.
- `npm run build` passed with the existing Monaco chunk-size warning.
- `npm test` passed all 18 tests. Rust formatting and `git diff --check` passed.
- The integrated Rust test was not rerun; its previous attempt remains blocked
  by missing Linux GLib/GObject/GIO development metadata. Pinned-server/native
  integration was not run because the JAR is not staged.

### Limitations and next steps

- Exercise versioned diagnostics and request races against the pinned server in
  native Tauri, then continue P1-03 with authoritative multi-document sync.
- Keep P2 paused. Continue planning headless Actions and optional native/remote
  desktop reviewer delivery after runtime validation.

## 2026-11-18 — Add capability-gated completion

### Tasks/status

- **P1-02 in progress:** added Monaco completion requests to the single-buffer
  adapter; pinned-server and native Tauri validation remain outstanding.

### Work and decisions

- Register completion only when the server advertises `completionProvider`.
  Forward trigger characters and LSP completion context, honor Monaco
  cancellation, and map supported labels, kinds, insertion/snippet text,
  text edits, documentation, and incomplete-list state. Advertise the
  completion snippet and documentation-format capabilities in `initialize`.
- Extracted defensive completion-result normalization and added tests for array
  and list responses, incomplete lists, malformed items, and invalid shapes.
  No new dependencies were introduced.

### Validation

- `npm test` passed all 14 tests; `npm run build` passed with the existing
  Monaco chunk-size warning.
- Rust formatting and whitespace checks passed. Native Tauri/server testing
  remains unavailable because the pinned JAR is not staged and this environment
  lacks Linux GIO/GLib development metadata.
- Post-commit CodeQL reported zero JavaScript alerts but timed out before all
  languages completed; this is not a clean all-language result, and the tool
  advised against retrying.

### Limitations and next steps

- Exercise completion, hover, diagnostics, and version synchronization against
  the pinned server in a native Tauri build. Keep P1 in progress and P2 paused.
- Follow the Phase 1 plan's headless Actions and optional Codespace/native
  reviewer strategy only after the actual runtime integration is tested.

## 2026-11-18 — Harden LSP ordering and process-exit handling

### Tasks/status

- **P1-01 in progress:** added explicit backend process-exit delivery and
  terminal process cleanup; native Tauri/server validation is still required.
- **P1-02 in progress:** serialized outbound JSON-RPC frames so document
  notifications cannot overtake one another; server exit now clears editor
  providers/markers and presents a retryable UI state.

### Work and decisions

- Addressed both high-confidence findings from code review of the Monaco
  integration: concurrent `didChange` IPC calls could arrive out of order, and
  the UI ignored process termination, leaving a stale connected state.
- Added a serialized send queue and regression test, plus a dedicated Tauri
  `on_exit` channel. The worker terminates the child and removes the active
  session before notifying the client, preventing an immediate retry from
  racing the dead process.
- A follow-up review found a startup race where exit during `didOpen` could
  still mark a session connected. Added post-open and UI session-activity
  checks so the error/retry state is not overwritten.

### Validation

- `npm test` passed all 12 tests; `npm run build` passed with the existing
  Monaco chunk-size warning, including after the startup-race fix.
- `cargo fmt --all -- --check` passed. `cargo test --locked` could not compile
  the integrated crate because `glib-2.0`, `gobject-2.0`, and `gio-2.0` pkg-config
  metadata is missing.
- Post-commit CodeQL was run for these follow-up code changes but was cancelled
  due to timeout and returned no complete results. The tool instructed not to
  rerun. The earlier post-commit scan found zero JavaScript alerts but timed out
  before all languages, so there is no complete all-language result.

### Limitations and next steps

- Run the native Tauri build and lifecycle tests against the verified pinned
  server artifact. The implementation remains a single-buffer prototype.
- Continue headless CI/Codespace delivery planning as recorded below; keep P2
  paused until P1 validation is complete.

## 2026-11-18 — Prototype Monaco LSP adapter and validation path

### Tasks/status

- **P1-01 in progress:** connected the sample UI to the supervised transport;
  real-server and native Tauri validation remain outstanding.
- **P1-02 in progress:** implemented a project-owned Monaco adapter prototype
  for one in-memory sample document, diagnostics, and conditional hover.
- **P1 validation strategy recorded:** headless CI for repeatable checks, with
  optional native desktop or remote-desktop Codespace review for human testing.

### Work and decisions

- Added bounded JSON-RPC frame encode/decode and client request correlation,
  notification dispatch, timeout/cancellation, and cleanup in
  `poc/src/lspProtocol.ts`; added protocol tests.
- Added LSP initialize, didOpen/didChange/didClose, diagnostic-to-Monaco marker
  mapping, and hover-provider registration when advertised in
  `poc/src/lspEditor.ts`. The sample UI now offers connect/stop/retry controls
  and surfaces startup errors; it continues to use one unsaved sample buffer.
- Clarified the test/reviewer split in the Phase 1 plan: Actions should cover
  headless tests/build and pinned-artifact integrity; human UI review may use a
  native package or Codespace with remote desktop. A forwarded Vite page alone
  cannot validate Tauri IPC. No workflow or Codespace configuration is added
  before the real-server/native integration is proven.

### Validation

- `npm test` passed all 11 tests, including the new protocol tests.
- `npm run build` passed; the existing Monaco chunk-size warning remains.
- `npm ci` restored lockfile dependencies and reported the five existing high
  npm findings. No dependency was added for this adapter.
- Post-commit CodeQL reported zero JavaScript alerts, but timed out before all
  languages completed. This is a partial scan; the tool said another run will
  not complete successfully, so no retry was made.
- Integrated Tauri tests/build and real-server runtime were not run: Linux
  GIO/GLib development metadata is missing, and the pinned JAR is not staged.

### Limitations and next steps

- Complete P1-01 native/server lifecycle validation, then verify P1-02 behavior
  against the pinned server, including restart/recovery and end-to-end hover.
- Keep P2 paused. Add CI and optional reviewer delivery configuration after the
  integration target and its native prerequisites are confirmed.

## 2026-11-18 — Defer PoC risks and begin Phase 1

### Tasks/status

- **P0-07 complete for the non-shipping PoC by explicit deferral:** the user
  approved carrying the documented security risks so work can continue.
- **P0-EXIT complete for the scoped architecture:** initial feature semantics
  and edit paths are mapped, and remaining dependency/artifact risks are
  explicitly accepted or deferred with re-open triggers.
- **P1-01 in progress:** selected Rust-supervised stdio LSP transport and added
  bounded framing, child-process supervision, and Tauri IPC start/send/stop
  commands; LSP initialize/shutdown and the real packaged-server exercise are
  still outstanding.
- **P1-02 in progress:** reviewed the Monaco bridge candidates. The provisional
  direction is a small project-owned adapter using Monaco providers and Tauri
  IPC channels; compatibility of the deferred `monaco-languageclient` package
  with the pinned editor is not established by its published table.

### Work and decisions

- Added an accepted/deferred risk register to the Phase 0 findings covering the
  five npm highs, five RustSec warnings, Tauri 2.9.2 GHSA, unverified nf-schema
  blob, and deferred Monaco LSP bridge.
- Made the scope explicit: this is internal/local PoC and Phase 1 risk
  acceptance, not a clean scan, false-positive finding, or release approval.
  Preserved loopback-only Vite, Tauri >=2.11.1 before Windows/Android support,
  and pre-release dependency/artifact re-audit gates.
- Updated the capability matrix and P0 tracker to close the audit phase against
  its documented evidence and explicit risk dispositions; no deferred
  dependency is included, activated, or treated as verified.
- Started P1-01 by recording the narrow transport direction: Rust-supervised
  child process, stdio LSP framing, and restricted Tauri command/channel
  communication. Added an initial Rust Content-Length framing codec with fixed
  header/body limits and no child process launch or frontend-exposed executable
  path. Continued with a Rust child-process supervisor that invokes Java
  directly with `-jar`, keeps framed stdout separate from bounded/drained
  stderr, and supports timed reads, exit polling, and termination.
- Added session-scoped Tauri start/send/stop commands and raw protocol/stderr
  channels, with child termination when the app window closes. The executable
  name is fixed to `java`; frontend input cannot choose a path or workspace.
  Start attempts are serialized before artifact verification/process creation,
  avoiding duplicate child launches.
- Added pinned `@tauri-apps/api` `2.9.0`; its advisory database check reported
  no findings. The API-to-Rust pairing awaits native compilation and runtime
  exercise.
  Startup resolves only the bundled language-server resource, rejects
  non-regular or oversized files, and checks its pinned SHA-256 before launch.
  Added a typed frontend IPC helper, but the static editor intentionally does
  not call it. Bundle resources map `poc/artifacts/` to the app's `artifacts/`
  directory; the JAR remains omitted from source control and is not downloaded.
- For P1-02, recorded upstream version alignment: `monaco-languageclient`
  `10.7.0` is paired with Monaco `0.55.1`, `11.0.2` with `0.56.0`, and `11.0.3`
  aligned with the project's `0.57.0` is marked unreleased. No library was
  installed; the provisional custom-adapter direction still needs an end-to-end
  proof against the selected server.

### Validation

- Reviewed the Phase 0 exit criterion against the capability matrix and current
  risk evidence; checked that unresolved items are represented as explicit
  accepted/deferred work rather than marked fixed.
- A strict standalone Rust harness compiled both std-only LSP modules with
  `rustc --edition=2024 -D warnings --test`; all eleven framing/supervision
  tests passed, including child echo, malformed output, timeout, separate
  stderr, and termination. `cargo fmt --all -- --check` passed. Integrated
  Cargo tests remain blocked because Linux lacks `gio-2.0`/`glib-2.0`
  development metadata.
- A temporary isolated Cargo test harness ran the five SHA-256/resource
  verifier tests successfully (known digest calculation, incorrect digest,
  oversized-file and symlink rejection, and pinned limits). Tauri command
  integration has not compiled in this environment because the integrated test
  and Tauri build hit the missing native GTK/GIO/GLib dependencies.
- After restoring `node_modules` with `npm ci`, all seven `npm test` cases and
  `npm run build` passed. The build retains the existing Monaco chunk-size
  warning; `npm ci` reports the five previously recorded high npm findings.
- Dependency scan status remains unchanged: five high npm findings, five
  RustSec warnings in the last successful audit; the latest Rust audit runner
  could not execute because `cargo-audit` was absent. nf-schema artifact
  verification remains unavailable. Registry attestations remain unverified.
- Internal Markdown links/anchors, `git diff --check`, and secret scanning
  passed. The Tauri resource mapping validates against the installed CLI schema;
  integrated Cargo tests and the Tauri build remain blocked by missing Linux
  GTK/GIO/GLib/WebKit prerequisites.
- Post-commit CodeQL reported no JavaScript alerts, but timed out before all
  languages completed. Treat this as a partial scan; the tool advised against
  retrying because the same run will not complete successfully.

### Limitations and next steps

- **P1-01:** stage and exercise the verified packaged JAR; implement LSP
  initialize/shutdown, process-tree cleanup, crash/restart recovery, and
  integration tests. Do not expose shell or arbitrary executable paths to the
  frontend.
- **P1-02:** prototype the project-owned Monaco provider adapter, or revisit the
  library choice when a compatible released version is available; verify
  diagnostics/request mapping and lifecycle/version behavior.
- **Re-open P0-07/P0-EXIT** before release, wider distribution, material
  dependency changes, Windows/Android support, or enabling deferred artifacts.
- Notify the user only if a dependency is confirmed closed/proprietary; current
  inventory contains open-source licenses and accepted notice/source terms.

## 2026-11-18 — Accept open-source dependency licenses

### Tasks/status

- **P0-07 advanced; licensing is no longer a blocker.** The user authorized
  accepting open dependency licenses and adjusting local license terms; report
  only if a dependency is confirmed to require a closed/proprietary license.
- **P0-07 and P0-EXIT remain blocked** by dependency advisories, nf-schema
  artifact verification, and provenance work.

### Work and decisions

- Added root [MIT license](LICENSE) and declared `MIT` in the PoC npm and Cargo
  package metadata. The license covers project-authored code; dependencies
  retain their respective licenses and notices.
- Reviewed the current npm SBOM (54 components; all have declared licenses) and
  Cargo metadata (494 packages, including the prototype). The current
  dependency license expressions are open-source (MIT, Apache-2.0, ISC, BSD,
  MPL-2.0, Unicode-3.0, and other open terms); no closed/proprietary license
  was found. Copyleft terms are accepted, with required notices and
  source-availability obligations to be followed.
- Added the open-license acceptance/escalation policy to [AGENTS.md](AGENTS.md)
  and removed the missing-project-license blocker from the audit findings,
  capability matrix, and tracker.

### Validation

- `npm ci` installed exactly the locked graph; npm reported the existing five
  high-severity advisories. `npm sbom` listed 54 components with no missing
  license metadata.
- `cargo metadata --locked` resolved 494 packages; all have declared license
  expressions, including the now-declared `nf-gui-poc` MIT license.
- `npm test` passed all seven tests; `npm run build` passed with the existing
  Monaco chunk-size warning. `npm audit --omit=dev --audit-level=moderate`
  reported zero vulnerabilities; the full npm audit still reports five high
  findings through the Vite/picomatch build chain.
- `npm run audit:dependencies` confirmed it runs both scanners, but the Cargo
  leg could not execute because `cargo-audit` is not installed in this
  environment. The last completed Cargo audit on this unchanged lockfile
  reported five RustSec warnings. `cargo fmt --check` and internal Markdown
  path checks passed; `git diff --check` passed.
- Secret scanning found no secrets. No CodeQL run was requested for this
  documentation and package-metadata-only change.

### Limitations and next steps

- The project license change applies to project-authored code only and does not
  replace dependency terms. Preserve upstream notices and comply with each
  dependency's source-availability obligations.
- **P0-07:** continue reviewing the npm/RustSec advisories, nf-schema digest and
  provenance, and deferred bridge candidates. Notify the user only if a
  dependency is confirmed to require a closed/proprietary license.
- **P0-EXIT:** remains open until the remaining security/provenance evidence is
  dispositioned and the phase matrix is reviewed.

## 2026-11-18 — Require concise chat handoff summaries

### Tasks/status

- **DOC-03 complete:** added repository-level agent guidance requiring a
  concise work summary in each final chat response.

### Work and decisions

- Added root [`AGENTS.md`](AGENTS.md) with handoff expectations for implementation
  and research, including actual validation outcomes, blockers, and next actions.
- Clarified that summaries belong in chat; a separate summary or handoff file is
  created only when the user explicitly requests that artifact.
- Linked the harness from the [README](README.md) and
  [required progress reporting](PLAN.md#required-progress-reporting), and added
  stable task ID DOC-03 to the plan and tracker.

### Validation

- Checked Markdown links in the changed documents and ran `git diff --check`.
- No application code or runtime behavior changed; no build or application tests
  apply.
- Secret scanning passed with no secrets detected. CodeQL was not run because
  the changes are documentation-only.

### Limitations and next steps

- The instruction harness establishes a repository convention for agents that
  read `AGENTS.md`; it is not a technical mechanism that can enforce chat output
  for systems that ignore repository guidance.
- Continue P0 work under its existing blockers; no P0 status changed in this
  documentation task.

## 2026-11-18 — Make dependency audits complete and actionable

### Tasks/status

- **P0-07 advanced but remains blocked; P0-EXIT remains open.** Added a combined
  audit runner so both package ecosystems are checked even when one scanner
  fails. Current dependency/license/provenance issues still prevent closure.

### Work and decisions

- Added `npm run audit:dependencies`, which runs npm and Cargo advisory scans
  sequentially and fails if either does. Added tests for both continuing after
  an npm failure and reporting success when both checks pass.
- Corrected the Vite fallback rationale: Vite `6.2.7` is within separate
  dev-server WebSocket and `launch-editor` affected ranges; Vite `6.4.4` still
  depends on vulnerable `picomatch`. No safe Vite-only downgrade was identified.
- Refined RustSec exposure notes: `chrono` is an optional `serde_with` lockfile
  entry with no active path in `cargo tree --target all`; the other four
  findings are reachable through Tauri's transitive/platform dependencies.
- Recorded that the PoC crate has no declared license. No license should be
  inferred; an owner decision is needed before public redistribution, not for
  continuing internal prototype work.

### Validation

- `npm test` passed all seven tests; `npm run build` passed with the existing
  Monaco chunk-size warning.
- Fresh `npm audit --omit=dev --audit-level=moderate` passed with zero
  vulnerabilities. Full `npm audit` still reports five high findings.
- `cargo audit --deny warnings` ran against the locked graph and denied five
  RustSec findings. The combined command was verified to execute Cargo after
  npm fails and to return failure when either audit fails.
- `npm view vite@6.4.4 dependencies` confirmed its `picomatch` `^4.0.2`
  dependency. Advisory review confirmed the downgrade ranges recorded above.
- Native Tauri build remains unverified because Linux GTK/WebKit development
  prerequisites are absent. nf-schema artifact verification remains blocked by
  registry DNS resolution. No new license or platform support claim was made.

### Limitations and next steps

- **P0-07:** keep the existing baseline and do not force a Vite downgrade.
  Re-run advisory checks when picomatch gains a patched release or the toolchain
  changes; recover nf-schema registry access and verify its digest/provenance;
  review the deferred LSP bridge before adding it. A maintainer license decision
  is only needed before public redistribution.
- **P0-EXIT:** remains open until P0-07 findings are dispositioned and the
  complete evidence matrix is reviewed.
- **Tauri:** retain `2.9.2` for the PoC as directed; upgrade and re-audit before
  Windows/Android shipment or support.

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
