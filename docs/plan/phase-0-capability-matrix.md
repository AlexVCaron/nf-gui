# Phase 0 capability matrix and baseline selections

[Phase 0 requirements](phase-0-upstream-audit.md) · [Audit findings](phase-0-audit-findings.md) · [Task tracker](../../PLAN_TRACKING.md#phase-0--upstream-audit)

This file completes the versioned matrix work for **P0-06** and the baseline
selection work for **P0-08**. It records the selected compatibility line, the
verified capability/gap matrix, and how each initial-release feature is meant
to obtain semantics and perform edits without creating an application-owned
Nextflow model.

All capability and baseline conclusions here are derived from the cited upstream
evidence collected in [phase-0-audit-findings.md](phase-0-audit-findings.md),
especially the P0-01 through P0-05 and P0-07 sections. The current integration
pins below are dated implementation updates, not claims that the older
feature-audit evidence automatically applies to newer server releases.

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
| Language server feature-audit baseline | `nextflow-io/language-server` `v26.04.4` | Phase 0 capability findings remain specifically tied to this audited version. |
| Language server integration artifact | `nextflow-io/language-server` `v26.10.2` | Latest stable release published 2026-10-27; the JAR's GitHub release digest was independently verified. Initialize/shutdown works locally; feature compatibility and server behavior still require P1 validation. |
| Desktop shell | Tauri `2.12.7` | Updated from 2.9.2 after a native dependency-interface compilation failure and to exceed GHSA-7gmj-67g7-phm9's first patched version (`2.11.1`). Ubuntu 24.04 x86_64 native build passed and the app remained open under Xvfb; Connect/Stop UI use and macOS/Windows remain unvalidated. |
| Frontend bridge | `@tauri-apps/api` `2.12.5` | Updated with Tauri for a compatible current stable pairing. Advisory database returned no direct findings; live IPC remains untested. |
| Canvas | `@xyflow/react` `12.11.6` | Current acceptable audited canvas dependency. |
| Source editor path | Monaco, with the bridge selection reopened for phase 1 | The prototype uses Monaco `0.57.0` as plain text only. The previously selected stable compatibility set remains a candidate, but its full npm graph surfaced advisories and needs a fresh compatibility/security review before integration. |
| Monaco editor | `0.55.1` bridge candidate; `0.57.0` standalone PoC | `0.55.1` is the documented stable compatibility-table entry with client `10.7.0`; `0.57.0` is used only by the non-LSP prototype. Both roles must remain distinct. |
| Monaco LSP bridge | `monaco-languageclient` `10.7.0` deferred | Its current dependency graph includes affected Codingame packages. npm proposed a major update to `11.0.3`; recheck compatibility, lockfiles, and advisories before choosing a bridge. |
| Monaco VS Code compatibility layer | `@codingame/monaco-vscode-api` `25.1.2` deferred | The old compatibility-table entry is not in the prototype manifest; npm reported versions through `33.0.9` affected and suggested a major update to `39.0.4`. |
| Optional schema plugin | `nf-schema` `2.8.0` | Keep available as a pinned opt-in runtime plugin rather than a bundled default dependency. |

## Rejected or deferred baseline alternatives

| Alternative | Status | Reason |
|---|---|---|
| `monaco-editor` `0.56.0` + `monaco-languageclient` `11.0.0-next.3` | Not selected | Newer TypeFox docs report `11.0.3`, while the compatibility table still labels that row unreleased; verify release status, compatibility, provenance, and risk before reconsidering. |
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
| Cancellation | Entry check only established on selected `v26.04.4` baseline; stronger behavior tested on newer `main` | `v26.04.4` request wrappers check cancellation before dispatch; inspected code does not establish cooperative cancellation during service analysis. Server commit `126aaafb` tests cancellation during requests and workspace builds, but is newer than the selected release. | Do not assume newer-main cancellation/recovery behavior exists in the pinned artifact; cancellation during analysis and selected-release failure recovery remain unproven. |
| Stale-result behavior | Partially characterized on selected `v26.04.4` baseline | Some request families can observe the debounce window; the inspected diagnostics publisher omits document versions. Newer-main tests exercise version checks and versioned diagnostics. | Stale analysis/diagnostics remain a risk for the selected release; newer-main freshness guarantees are not part of the selected baseline. |
| Cross-file resolution | Supported for local includes and several symbol operations | Definition/reference/rename flows work across local modules; include resolution and dependency-ordered analysis are implemented. | Plugin includes resolve only to placeholders in strict parsing, and remote module/runtime install paths are not safe semantic defaults for untrusted inspection. |
| Supported Nextflow syntax | Strict-parser-centered 26.04 language line | The selected baseline assumes strict-parser semantics and typed-parameter support. | Minimal strict-parser call typing and unsupported legacy Groovy patterns limit what the GUI can treat as safely editable. |
| Project language-line handling | Supported by language-server configuration, not yet designed in nf-gui | The official client can set `nextflow.languageVersion` per workspace and restart the server when that value changes. | nf-gui still needs an explicit policy for detecting a project's declared Nextflow version and choosing the right supported language line or warning/fallback behavior. |
| Schema dialect handling | Mixed upstream ecosystem; conservative UX decision recorded | nf-schema 2.8.0 is a 2020-12-only validator with Nextflow-specific evaluators; nf-core/tools code has dialect-selection support, despite conflicting migration guidance. | Display schema provenance/dialect and declared metadata separately from validation and effective values; do not infer or auto-convert unknown schemas or execute checks on open. |
| Available structured edits | Rename plus typed-conversion commands | Official rename returns `WorkspaceEdit`; typed conversion is an execute-command workflow. Parser AST positions exist, but exact editable subranges and cross-version API stability are not established. | No upstream structured edit API exists for visual graph rewiring, port creation, or argument-binding edits; source-preserving adapter edits remain unproven. |
| Release compatibility | Pinned current integration dependencies and conservative editor candidates | Java 17+, a historical Nextflow 26.04 semantics audit, server JAR v26.10.2 for integration, Tauri 2.12.7, and the separately reviewed Monaco compatibility set. | P0-07 was re-audited for the non-shipping PoC scope: npm audit is clean, while three RustSec warnings remain explicitly deferred. Only Ubuntu native build/window launch was checked; macOS/Windows and v26.10.2 behavior through the Monaco/Tauri UI remain unverified and block broader support claims. |

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
5. **Selected managed toolchain baseline:** Java 17+, Tauri `2.12.7`,
   `@tauri-apps/api` `2.12.5`, Nextflow `26.04` semantics (the historical
   audited line), language server `v26.10.2` (current integration artifact),
   and conservative stable Monaco compatibility rather than the current
   prerelease bridge line. Server behavior on v26.10.2 remains to be verified.
6. **Existing-project policy:** do not require every opened repository to move
   to `26.04.3+`; instead, detect project compatibility and select the closest
   supported language line or warn/fallback conservatively.
7. **Java distribution status:** Java 17+ is a phase-0 prerequisite; bundled or
   managed JRE distribution remains a later packaging decision, not a closed
   upstream-audit fact.

## Phase 0 disposition

P0-01 through P0-06 and P0-08 have evidence-backed research dispositions in
[phase-0-audit-findings.md](phase-0-audit-findings.md). Operational tests belong
to the implementation phases: Phase 1 must prove process restart/resynchronization,
the packaged Monaco workers/CSP and IPC transport; Phases 2/3 must prove exact
source-edit ranges and round trips. These remain explicit limitations, not
upstream guarantees or completed implementation.

**P0-07 and P0-EXIT are complete for the scoped, non-shipping prototype by
explicit risk disposition, not because all scanners are clean.** The original
audit recorded five npm high findings and five RustSec warnings; the dependency
graph has since changed and must be re-audited before relying on those counts.
Tauri `2.12.7` is above the first fixed release for GHSA-7gmj-67g7-phm9, but
Windows and macOS remain unvalidated. The unused nf-schema blob remains
deferred. See the [accepted and deferred risk register](phase-0-audit-findings.md#accepted-and-deferred-risks)
for historical findings and upgrade triggers. Registry attestations remain
unverified. Keep required open-source license notices/source obligations.
Re-open P0-07/P0-EXIT before any release, broader distribution, material
dependency change, or use of a deferred artifact.
