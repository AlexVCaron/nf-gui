# Phase 0 capability matrix and baseline selections

[Phase 0 requirements](phase-0-upstream-audit.md) · [Audit findings](phase-0-audit-findings.md) · [Task tracker](../../PLAN_TRACKING.md#phase-0--upstream-audit)

This file completes the versioned matrix work for **P0-06** and the baseline
selection work for **P0-08**. It records the selected compatibility line, the
verified capability/gap matrix, and how each initial-release feature is meant
to obtain semantics and perform edits without creating an application-owned
Nextflow model.

All capability and baseline conclusions here are derived from the cited upstream
evidence collected in [phase-0-audit-findings.md](phase-0-audit-findings.md),
especially the P0-01 through P0-05 and P0-07 sections.

## Selected baseline

Choose the most conservative compatible stack that still preserves the planned
architecture:

| Layer | Selected baseline | Why this is the current choice |
|---|---|---|
| Java runtime | Java 17+ external prerequisite for phase 0 | Required by the Nextflow language server, Nextflow 26.04 tooling, and nf-schema; bundling vs managed download remains a later packaging decision. |
| Default audited language line | `26.04` | Matches the current stable language-server line and the strict-parser-default release line used for the deepest audit. |
| Managed-toolchain engine floor | `26.04.3+` | Applies to app-managed Nextflow artifacts and test/tooling baselines so they stay above the published Nextflow core advisory fix line. |
| Existing-project opening policy | Do not require opened projects to upgrade to `26.04.3+` | Existing projects must still open; the app should inspect project-declared compatibility and configure language analysis conservatively instead of forcing a global engine floor on the user's repository. |
| Nextflow engine / parser line for audited semantics | `26.04.6` | Current stable audited release line; strict parser is enabled by default in 26.04+. |
| Parser mode | Strict parser by default on the audited `26.04` line, with project-version-aware fallback decisions still required | The language server and the audited `nf-lang` path depend on strict-parser semantics, but existing projects may need older language lines or non-strict handling to avoid false positives. |
| Language server | `nextflow-io/language-server` `v26.04.4` | Current stable audited server release with documented stdio transport and custom graph commands. |
| Desktop shell | Tauri `2.9.2` | Stable Tauri 2 line with known packaging/security tradeoffs already audited. |
| Frontend bridge | `@tauri-apps/api` `2.9.0` | Official paired frontend API package for the chosen Tauri line. |
| Canvas | `@xyflow/react` `12.11.6` | Current acceptable audited canvas dependency. |
| Source editor path | Monaco, conservative compatibility line pending phase-1 integration spike | Preserve the planned Monaco direction while avoiding the current unreleased bridge line and keep the worker/CSP proof explicit. |
| Monaco editor | `0.55.1` | Latest stable version aligned with stable `monaco-languageclient` `10.7.0` in the upstream compatibility table. |
| Monaco LSP bridge | `monaco-languageclient` `10.7.0` | Latest stable audited bridge version compatible with Monaco `0.55.1`. |
| Monaco VS Code compatibility layer | `@codingame/monaco-vscode-api` `25.1.2` | The aligned compatibility-table entry for `monaco-languageclient` `10.7.0`. |
| Optional schema plugin | `nf-schema` `2.8.0` | Keep available as a pinned opt-in runtime plugin rather than a bundled default dependency. |

## Rejected or deferred baseline alternatives

| Alternative | Status | Reason |
|---|---|---|
| `monaco-editor` `0.56.0` + `monaco-languageclient` `11.0.0-next.3` | Deferred | Works only on the current unreleased bridge line; avoid taking prerelease dependency risk before phase 1 proves the editor path. |
| Runtime Nextflow DAG as the workflow-canvas authority | Rejected | Runtime DAG generation is an execution/dataflow artifact, not a safe source-editing authority. |
| Treating nf-core module metadata as the primary semantic model | Rejected | Helpful metadata, but not authoritative for runtime semantics or all projects. |
| Bundling nf-schema as a default application dependency | Rejected | Keep as an optional pinned runtime plugin because it is runtime-fetched and not universally present. |
| Localhost WebSocket bridge between UI and language server | Rejected | Tauri channels plus a Rust-supervised stdio child process are sufficient and keep trust boundaries tighter. |

## Capability matrix for the selected language-server line

Selected server baseline: **Nextflow language server `v26.04.4`** on the
**Nextflow `26.04`** language line, with Java 17+ and strict-parser semantics
as the default audited path, while leaving room for project-version-aware
reconfiguration on older or not-yet-migrated projects.

| Area | Verified support in selected line | Current behavior / payload shape | Gap or risk that remains relevant |
|---|---|---|---|
| Standard requests | Incremental text sync, workspace folders, call hierarchy, code lens, completion, definition, formatting, document links, document symbols, hover, references, semantic tokens, rename, workspace symbols | Capabilities are explicitly registered by the server and consumed by the official VS Code extension. | No standard graph request, code-action provider, or signature-help provider was found. |
| Custom commands | `nextflow.server.previewDag`, `nextflow.server.previewWorkspace`, `nextflow.server.convertPipelineToTyped`, `nextflow.server.convertScriptToTyped` | Exposed as execute-command entries rather than standard LSP methods. | These commands are editor-facing extensions, not a stable standard protocol. |
| Structural payloads | Workspace preview plus DAG preview | `previewWorkspace` returns a narrow definition-oriented schema (`name`, `type`, `path`, `line`, optional `children`); `previewDag` returns Mermaid text or an error. | No public typed graph schema for ports, edges, argument bindings, or editable invocation instances. |
| Unsaved buffers | Supported at the server level | In-memory file cache and incremental updates let open buffers be analyzed before save. | Editor-side overview refresh can lag unsaved edits, and some request families can return stale results during the debounce window. |
| Cancellation | Request wrappers are cancellation-aware | Server request handlers are wrapped with `cancelChecker.checkCanceled()`. | Phase 0 still lacks strong evidence that every deeper analysis stage aborts immediately once cancellation is requested. |
| Stale-result behavior | Partially characterized | Completion, formatting, and custom commands recompile eagerly or wait for updated analysis more often than definition/hover/reference flows do. | Stale analysis remains a known risk for some request types while the debounce window is open. |
| Cross-file resolution | Supported for local includes and several symbol operations | Definition/reference/rename flows work across local modules; include resolution and dependency-ordered analysis are implemented. | Plugin includes resolve only to placeholders in strict parsing, and remote module/runtime install paths are not safe semantic defaults for untrusted inspection. |
| Supported Nextflow syntax | Strict-parser-centered 26.04 language line | The selected baseline assumes strict-parser semantics and typed-parameter support. | Minimal strict-parser call typing and unsupported legacy Groovy patterns limit what the GUI can treat as safely editable. |
| Project language-line handling | Supported by language-server configuration, not yet designed in nf-gui | The official client can set `nextflow.languageVersion` per workspace and restart the server when that value changes. | nf-gui still needs an explicit policy for detecting a project's declared Nextflow version and choosing the right supported language line or warning/fallback behavior. |
| Schema dialect handling | Mixed upstream ecosystem | nf-schema is effectively 2020-12 only, while nf-core tools still span draft-07 and 2020-12 conventions. | Parameter-form UX must distinguish native typed params, nf-schema semantics, and nf-core metadata without assuming one dialect or source is universal. |
| Available structured edits | Rename plus typed-conversion commands | Official rename returns `WorkspaceEdit`; typed conversion is an execute-command workflow. | No upstream structured edit API exists for visual graph rewiring, port creation, or argument-binding edits. |
| Release compatibility | Stable server release line plus stable frontend/editor line | Java 17+, Nextflow 26.04 semantics, Tauri 2.9.2, conservative Monaco compatibility line. | Upstream current Monaco head is newer than the stable bridge line, so the project must pin carefully rather than follow “latest”. |

## Feature-to-semantics and edit-path matrix

This table explains how each initial-release feature obtains semantics and, when
editing is involved, what the intended edit path is.

| Initial-release feature | Semantic authority | Edit path | Buffer / workspace expectations | Constraints and unsupported cases |
|---|---|---|---|---|
| Existing-project opening | Tauri filesystem permissions plus workspace selection; no project-side model file | No source edit required | Workspace root becomes the authority for server startup, file watching, and document sync | Opening a project must not execute the pipeline or auto-install remote modules/plugins. |
| Project compatibility detection | Project-declared Nextflow compatibility plus app-managed support matrix | No source edit required | Opening should inspect manifest/config hints, choose a supported language line where possible, and warn when the project is outside the audited support set | The managed `26.04.3+` floor applies to app-managed tooling, not as a requirement imposed on every repository the user opens. |
| Official diagnostics | Nextflow language server on the selected `26.04` line | Read-only | Diagnostics should work on unsaved buffers through cached analysis; stale windows remain possible during debounce | Diagnostics are only as complete as the server and strict parser allow; plugin placeholders remain a semantic gap. |
| Navigation (definition, references, symbols, hover, semantic tokens) | Nextflow language server first | Read-only | Cross-file local include navigation is supported; unsaved open buffers are supported with the known stale-result caveat | No assumption that hover/completion text is a structured semantic API. |
| Source-backed workflow visualization | Language-server custom commands first, then a thin strict-parser adapter only where necessary | Read-only in phase 2; no direct source edit here | `previewWorkspace` and `previewDag` can derive useful projections without execution | The canvas must expose unresolved/stale/unsupported areas instead of inventing missing structure. |
| Definition and invocation inspection | Language server plus strict-parser adapter where the server payload is too shallow | Read-only | Local module resolution is supported; invocation-level detail may require adapter enrichment | No plugin-signature authority yet; invocation instances are not first-class server objects today. |
| Module/include navigation | Language server definition/reference paths plus strict-parser include resolution rules | Source edits only through later minimal transactions when includes are intentionally changed | Local includes and aliases are supported; remote module install must stay explicit and permissioned | `plugin/...` includes are unresolved placeholders in core parsing and must stay conservatively handled. |
| Parameter forms | Native typed params first, then nf-schema/nf-core metadata as supplemental validation/display sources | Literal/source-preserving parameter edits through later version-checked source transactions | Typed params and schema files can both inform UI; config and CLI resolution stay distinct | Do not treat schema metadata as process-port truth, and do not assume nf-core metadata exists. |
| Safe visual edits: rename | Official language-server rename | Apply returned `WorkspaceEdit` as the authoritative edit | Cross-file rename is supported where the server resolves the symbol set | Unsupported constructs or unresolved symbols must fall back to source editing. |
| Safe visual edits: literal parameter/default changes | Thin strict-parser adapter plus version-checked source transaction layer | Minimal text edits at exact source ranges, followed by reanalysis | Must work against unsaved authoritative buffers and reject stale versions | Only operate in a documented safe subset with explicit source ranges and without evaluating runtime expressions. |
| Safe visual edits: include/invocation insertion, removal, or rewiring | Strict-parser adapter over official AST/source ranges; optionally official rename/formatting where applicable | Minimal multi-file source transactions plus immediate reanalysis | Must remain atomic across files and reject stale analysis | Phase 0 evidence is not strong enough to support plugins, remote-module side effects, or arbitrary graph rewrites. |
| Undo/redo | Application-owned edit transaction log over authoritative source buffers | Invert and replay prior accepted source transactions | Must track file versions and external modifications | Never rely on a separate pipeline model as the undo source of truth. |
| External-change handling | Filesystem watcher plus document-version reconciliation | Reanalyze, surface conflicts, and reject stale visual edits | Duplicate or reordered watch events must not silently discard local buffer state | Projects remain editable in source view even when visual state is stale. |
| Compatibility and unsupported-construct indicators | Language-server diagnostics, strict-parser limits, and matrix-defined supported subset | Read-only | Indicators should update after reanalysis of the current authoritative text | Unsupported constructs must degrade to view-only/source fallback rather than partial mutation. |

## Resulting P0-06 and P0-08 decisions

### P0-06

The project now has a versioned matrix for the selected server line covering:

- standard requests and advertised capabilities
- custom commands and payload shapes
- unsaved-buffer behavior
- cancellation and stale-result behavior
- cross-file and include-resolution behavior
- supported syntax assumptions
- currently available structured edits
- semantic and editing gaps that still constrain the safe subset

### P0-08

The project now selects a baseline compatible stack and a matching semantics
strategy:

1. **Primary semantic authority:** the official Nextflow language server on the
   `26.04` line.
2. **Authoritative source of additional structure where the server is too
   shallow:** a thin adapter over official strict-parser / `nf-lang` entry
   points, not a second parser.
3. **Authoritative edit path:** source-preserving, version-checked text
   transactions; official `WorkspaceEdit` where upstream already provides it.
4. **Authoritative runtime boundary:** no implicit execution, plugin start, or
   remote-module installation during ordinary inspection/editing.
5. **Selected managed toolchain baseline:** Java 17+, Tauri `2.9.2`,
   `@tauri-apps/api` `2.9.0`, Nextflow `26.04` semantics, language server
   `v26.04.4`, and conservative stable Monaco compatibility rather than the
   current prerelease bridge line.
6. **Existing-project policy:** do not require every opened repository to move
   to `26.04.3+`; instead, detect project compatibility and select the closest
   supported language line or warn/fallback conservatively.
7. **Java distribution status:** Java 17+ is a phase-0 prerequisite; bundled or
   managed JRE distribution remains a later packaging decision, not a closed
   upstream-audit fact.

## Remaining blockers for Phase 0 exit

These selections complete **P0-06** and **P0-08**, but do not complete
**P0-EXIT**:

- P0-01 still needs stronger evidence for invalid/incomplete-source,
  cancellation, and stale-result coverage.
- P0-03 still needs stronger proof that the required editable subconstructs have
  stable enough source-location coverage for the intended safe subset.
- P0-05/P0-07 still need any remaining transitive/provenance follow-up the
  project wants before turning the selected baseline into real manifests, and
  phase 1 still needs the Monaco worker/CSP spike before the editor path can be
  considered fully proven.
- The exact safe visual-editing subset must still be frozen in phases 2 and 3
  based on the adapter proof, not on speculation.
