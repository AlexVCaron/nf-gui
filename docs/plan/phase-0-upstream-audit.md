# Phase 0 — Upstream audit and dependency decisions

[Main plan](../../PLAN.md) · [Next: language-server integration](phase-1-language-server.md)

**Required reporting:** update [task status and evidence](../../PLAN_TRACKING.md#phase-0--upstream-audit)
and [CHANGELOG.md](../../CHANGELOG.md) for work on this phase, including partial
progress and blockers; follow the [reporting workflow](../../PLAN.md#required-progress-reporting).

## Objective and exit criterion

Complete the upstream audit before treating architectural assumptions as proven:

- Inspect the source areas below.
- Select supported versions.
- Build the capability matrix.
- Identify semantic/editing gaps.
- Review licenses and advisories.

**Exit criterion:** there is evidence for how every initial feature obtains its
semantics and performs its edits. No frontend architecture decision should hide
an unresolved semantic dependency.

**Evidence status:** these are research tasks and candidate dependencies, not
verified findings or version-pinned selections. The initial plan did not perform
the live web/source audit.

## What can the language server actually provide?

The Language Server Protocol supplies a useful foundation, but it does **not**
standardize a complete programming-language model.

| Requirement | Potential LSP support | Important limitation |
|---|---|---|
| Diagnostics | Published or requested diagnostics | Coverage depends on the server and its configuration |
| Find a component definition | Definition requests | Does not necessarily expose its complete signature |
| Find uses of a component | References | Not equivalent to a dataflow graph |
| Browse symbols | Document/workspace symbols | Often omits expressions, argument relationships, and other required detail |
| Inspect documentation or types | Hover, completion, signature help | Presentation-oriented responses may not be structured semantic data |
| Rename a symbol | Rename/workspace edits | Support and scope must be verified |
| Apply suggested fixes | Code actions | Not a general visual-editing API |
| Obtain a pipeline graph | Possible custom extension | There is no standard LSP pipeline-graph method |
| Add ports, bind arguments, connect components | Possible custom extension | Not standard LSP operations |

**Do not build structural features by parsing hover Markdown, completion labels,
or diagnostic text.** Those are presentation surfaces, not dependable semantic
interfaces.

Produce a capability matrix for the selected language-server version:

- Supported standard requests.
- Advertised capabilities.
- Custom requests and commands.
- Payload schemas.
- Document-version behavior.
- Cancellation and stale-result behavior.
- Cross-file/module resolution.
- Supported Nextflow syntax.
- Available structural information.
- Available structured edits.
- Release and compatibility guarantees.

Every conclusion should point to both documentation and the corresponding
implementation or test where possible.

## Upstream audit

A complete audit should follow the actual dependency chain rather than
attempting to read every file in every related repository.

### A. Nextflow language server

Primary source: https://github.com/nextflow-io/language-server

Inspect:

- Server initialization and capability registration.
- Document synchronization.
- Parser/compiler dependencies.
- Workspace and module indexing.
- Symbol, reference, signature, and type representations.
- Diagnostics and their lifecycle.
- Custom protocol methods and commands.
- Formatting, rename, and code-action implementations.
- Tests covering incomplete and invalid source.
- Release packaging and Java requirements.

Questions to settle:

1. Does the server already expose a useful structural representation?
2. Can it distinguish definitions from invocation instances?
3. Can it associate invocation arguments with formal inputs?
4. Does it expose source ranges for all editable constructs?
5. Can it represent named outputs and their references?
6. Can it resolve imported modules and aliases?
7. Are graph-related interfaces supported public features or editor-specific
   internals?
8. Can structural results be requested against unsaved buffers?
9. Which operations remain valid when part of the workspace does not parse?

### B. Official Nextflow editor integration

Primary source: https://github.com/nextflow-io/vscode-nextflow

Inspect:

- How the extension obtains and launches the language server.
- JVM selection and configuration.
- Restart and recovery behavior.
- Custom server requests.
- Any graph or preview functionality.
- Configuration synchronization.
- Tests and compatibility assumptions.

The official client may demonstrate capabilities absent from generic LSP
documentation. Reuse protocols and design lessons, not VS Code-specific UI
dependencies.

### C. Nextflow core and documentation

Primary sources:

- https://github.com/nextflow-io/nextflow
- https://www.nextflow.io/docs/latest/

Audit:

- Parser and compiler frontend.
- AST and source-location support.
- Module resolution.
- Processes, workflows, inputs, outputs, and invocation semantics.
- Channel operators and branching.
- Configuration parsing and resolution.
- Parameter declarations and typing.
- Strict-syntax migration.
- Runtime graph generation.
- Plugin loading and initialization.

Important distinctions:

- A parsed source graph is not necessarily an execution graph.
- Syntax validation is not runtime validation.
- Parsing configuration is not necessarily resolving configuration.
- Compiler APIs may be internal and change between releases.
- A compilation pathway may execute transformations or initialize extensions;
  it must not automatically be considered safe for untrusted projects.

### D. Parameter schemas and nf-core conventions

Primary sources:

- https://github.com/nextflow-io/nf-schema
- https://nf-co.re/
- https://github.com/nf-core/tools
- https://github.com/nf-core/modules

Investigate:

- Supported JSON Schema dialects.
- Nextflow-specific schema extensions.
- Parameter validation behavior.
- Schema-to-parameter naming conventions.
- Samplesheet validation.
- Module metadata and its intended authority.
- Compatibility across schema/plugin versions.

Do not assume nf-core metadata exists for every Nextflow project, or that
parameter schemas describe process ports.

### E. Desktop and editor infrastructure

Primary sources:

- https://v2.tauri.app/
- https://github.com/tauri-apps/tauri
- https://microsoft.github.io/language-server-protocol/
- https://github.com/microsoft/monaco-editor
- https://github.com/TypeFox/monaco-languageclient
- https://reactflow.dev/
- https://codemirror.net/

Verify:

- Tauri process and capability boundaries.
- Packaging external executables and JVM artifacts.
- Platform-specific WebView restrictions.
- Monaco worker and content-security-policy requirements.
- Whether a Monaco/LSP integration can use Tauri IPC without requiring an
  unnecessary local WebSocket server.
- Editor/client version compatibility and dependency weight.

### F. Release, licensing, and supply-chain audit

For every selected direct dependency:

- Record its exact version and source.
- Check supported platforms.
- Review maintenance and release history.
- Review the license and redistribution obligations.
- Check published advisories.
- Record transitive dependency exposure.
- Verify artifact provenance and checksums.
- Distinguish runtime dependencies from development-only dependencies.

**Deliverable:** a version-pinned compatibility and dependency matrix, not a
collection of assumptions about “latest.”

## Recommended application architecture

### Tauri desktop shell

- Application lifecycle.
- Native dialogs.
- Scoped filesystem access.
- Process supervision.
- Secure IPC.
- Packaging and updates.

### React/TypeScript frontend

- Source editor.
- Visual workflow canvas.
- Component inspector.
- Diagnostics panel.
- Parameter forms.
- Navigation and project controls.

### Rust application backend

- Workspace permissions.
- Document synchronization and version tracking.
- Language-server transport.
- Managed JVM processes.
- Atomic edit coordination.
- Filesystem watching.
- Optional execution supervision.

### Official Nextflow tooling

- Official language server.
- Official parser/compiler infrastructure where necessary.
- Nextflow runtime for explicitly requested execution-dependent operations.
- Optional parameter-schema tooling.

The semantic projection and integration alternatives are detailed in
[phase 2](phase-2-structural-extraction.md).

## Backend language decision

Recommended division:

- **Rust:** desktop integration, transport, files, processes, security.
- **JVM:** Nextflow semantics, only where the official server needs
  supplementation.
- **TypeScript:** presentation and interaction.

This uses each platform where it provides a concrete advantage.

### Why not a Python backend?

Python would introduce another packaged runtime without simplifying access to
JVM-native Nextflow internals. It becomes attractive only if a separate,
substantial Python-specific feature emerges.

### Why not a Node.js backend?

The frontend build requires Node.js, but the installed application need not.
A Node runtime would duplicate facilities already available in Rust and add
another process/runtime to distribute.

### Why not implement the entire backend in Java?

That is viable, but Tauri still needs its native bridge. Rust can remain a thin
supervisor while Java owns semantics, without moving all desktop concerns into
Java.

### Why not embed a JVM directly in Rust?

JNI would tightly couple lifecycles, failure modes, native packaging, and
threading. Separate processes provide a cleaner recovery boundary. They are
not, by themselves, a security sandbox.

## Dependency inventory and rationale

These are **candidate direct dependencies and tools**, not version-pinned
selections. Final inclusion depends on the audit and integration spikes.

A complete transitive inventory can only be produced after selecting and
resolving actual versions.

### A. Core application

| Dependency | Decision | Rationale |
|---|---|---|
| Tauri 2 | Recommend | Desktop shell, Rust integration, packaging, and permission controls without shipping a full browser runtime |
| Rust | Recommend | Native supervision, filesystem coordination, IPC, and cross-platform process management |
| TypeScript | Recommend | Typed frontend contracts and safer handling of versioned analysis responses |
| React | Recommend | Good fit for Monaco integration and React Flow; reduces UI integration friction |
| Vite | Recommend | Straightforward frontend development/build integration for Tauri |
| React DOM | Include with React | Browser rendering |
| Tauri JavaScript API | Include | Typed communication with the native application boundary |
| `tauri-plugin-dialog` | Likely include | Native project and file selection with explicit user authorization |

**Alternative considered: Svelte.** A valid, potentially lighter choice. React
is recommended because the proposed editor/graph combination benefits from its
ecosystem—not because Tauri requires it.

**Alternative considered: Electron.** Strong desktop/web ecosystem, but less
aligned with the preference for Tauri and introduces a bundled Chromium/Node
runtime.

### B. Rust application infrastructure

| Dependency | Decision | Rationale |
|---|---|---|
| `serde` | Recommend | Explicit serialization for native/frontend contracts |
| `serde_json` | Recommend | LSP/JSON-RPC and application messages |
| `tokio` | Likely include | Asynchronous subprocess I/O, cancellation, and service supervision; align with Tauri’s runtime |
| `lsp-types` | Candidate | Typed standard LSP messages; custom Nextflow payloads remain separately defined |
| `url` | Candidate | Correct file/document URI handling; avoid manual URI construction |
| `notify` | Likely include | Cross-platform workspace file watching |
| `thiserror` | Recommend | Structured application errors without fragile string classification |
| `tracing` | Recommend | Structured observability across document updates, processes, and edit transactions |
| `tracing-subscriber` | Candidate | Controlled logging output and filters if not covered by the selected Tauri logging integration |

Avoid adding multiple competing logging or async stacks.

A generic JSON-RPC package should be considered only after checking whether it
handles LSP framing, bidirectional requests, cancellation, and Tauri transport
cleanly. Many JSON-RPC libraries target HTTP rather than language-server streams.

### C. Official Nextflow tooling

| Dependency | Decision | Rationale |
|---|---|---|
| Official Nextflow language server | Essential | Primary source for diagnostics and language intelligence |
| Compatible Java runtime | Essential | Required to run the selected official tooling; exact requirement must be verified |
| Official Nextflow parser/compiler artifacts | Conditional | Only for information or edits unavailable through supported language-server interfaces |
| Nextflow executable/runtime | Optional for editing; required for execution features | Keep editing independent from running pipelines |
| `nf-schema` | Optional, project-dependent | Official plugin-based parameter/schema validation where the project uses it |

#### Java distribution decision

Evaluate:

- User-provided Java.
- A bundled redistributable Java runtime.
- An application-managed verified download.

A bundled or managed runtime improves installation reliability but adds size,
platform builds, update obligations, and redistribution review.

Do not assume one Java/Nextflow/parser/server combination supports every project.

### D. Source editor

| Dependency | Decision | Rationale |
|---|---|---|
| `monaco-editor` | Preferred candidate | Rich IDE-style source editing |
| `monaco-languageclient` | Conditional | Reuse LSP/editor integration if compatible with the chosen Monaco versions and Tauri transport |
| `vscode-jsonrpc` | Conditional | Useful protocol implementation if the selected integration requires it |
| `vscode-languageserver-protocol` | Conditional | Standard protocol definitions/helpers, depending on the chosen client stack |
| `vscode-ws-jsonrpc` | Avoid unless required | A WebSocket-specific layer is unnecessary if communication remains over Tauri IPC |
| VS Code compatibility packages | Avoid by default | Potentially substantial dependency and version-coupling cost; include only for a proven requirement |

**Alternative: CodeMirror 6.** Consider it if Monaco’s workers, bundle size, or
compatibility stack become disproportionate. It provides flexible editing, but
the full IDE experience and LSP bridge may require more integration work.

Syntax highlighting may use a non-authoritative grammar. Such a grammar must
never drive semantic graph construction or edits.

### E. Graph interface

| Dependency | Decision | Rationale |
|---|---|---|
| `@xyflow/react` | Recommend | Interactive nodes, ports, edges, selection, and custom renderers |
| `elkjs` | Candidate after graph spike | Hierarchical layouts with compound structures and ports are useful for workflow graphs |
| `@dagrejs/dagre` | Alternative | Simpler layout option if the initial graph requirements do not justify ELK |

Do not ship two layout engines initially.

Alternatives considered:

- **Cytoscape.js:** stronger fit for graph exploration and analysis than a
  form-rich component editor.
- **Rete.js:** node-editor abstractions may encourage a second application-owned
  computation model.
- **Custom SVG/canvas:** unnecessary interaction and accessibility work at the
  beginning.

The graph library’s node objects must remain presentation data, never the
pipeline source of truth.

### F. Forms and schema support

| Dependency | Decision | Rationale |
|---|---|---|
| `ajv` | Candidate | Local JSON Schema validation for supported dialects |
| `ajv-formats` | Conditional | Standard format checks where required by the selected schemas |
| `@rjsf/core` | Candidate, not automatic | Generated schema forms may accelerate parameter editing, but custom extensions and expression handling need evaluation |
| React Hook Form | Alternative | More control for a bespoke inspector; avoid overlapping it with a full form-generation stack without need |

Keep generic JSON Schema validation distinct from Nextflow semantics.

Do not introduce Zod or another schema system as a competing definition of
pipeline parameters. It may be useful for application IPC contracts, but only
if that benefit justifies the additional schema layer.

### G. UI state and preferences

| Dependency | Decision | Rationale |
|---|---|---|
| React state/context | Start here | Sufficient until state complexity is demonstrated |
| Zustand | Optional | Useful for shared selection, panes, and transient UI state; not for canonical pipeline semantics |
| `tauri-plugin-store` | Optional | Persist non-sensitive application preferences and disposable layout state |

Do not introduce a database initially.

**SQLite considered and deferred:** indexing and caching requirements are not
yet established, and persisting a semantic graph risks accidental authority.

### H. Packaging and desktop extras

| Dependency/tool | Decision | Rationale |
|---|---|---|
| Tauri CLI/build tooling | Include | Platform builds and packaging |
| `tauri-plugin-updater` | Later | Add only with a signing, hosting, rollback, and release policy |
| `tauri-plugin-shell` | Avoid by default | Custom Rust supervision can expose a narrower interface than frontend-controlled process execution |
| `tauri-plugin-fs` | Avoid by default | Workspace-scoped Rust commands better enforce the intended file boundary |
| Gradle or Maven | Conditional | Only if a JVM adapter is necessary; prefer the upstream project’s build ecosystem |
| Docker/Podman | Not an application prerequisite | Relevant to optional pipeline execution, not source editing |
| Conda | Not an application prerequisite | A possible project execution dependency, not part of the GUI architecture |

### I. Testing and development tools

Because the repository has no existing test setup, select a small coherent
stack during application scaffolding.

| Tool | Decision | Rationale |
|---|---|---|
| Rust’s standard test framework | Include | Backend logic, framing, transactions, and process supervision |
| Vitest | Recommend | Frontend logic and projection/inspector tests |
| React Testing Library | Recommend | User-facing UI behavior and accessibility-oriented tests |
| Playwright | Candidate | Browser-level frontend workflows; not sufficient alone for native Tauri behavior |
| Tauri-compatible desktop test tooling | Verify before selection | Native WebView/driver support differs by platform |
| TypeScript compiler checks | Include | Contract and frontend correctness |
| ESLint | Recommend | Established TypeScript/React checks |
| `rustfmt` and Clippy | Include | Rust formatting and correctness checks |
| Existing upstream JVM test framework | Follow upstream | Avoid adding a second JVM test ecosystem unnecessarily |

No dependency should be added solely because it is common in desktop
applications.
