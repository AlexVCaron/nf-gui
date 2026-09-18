# Phase 0 audit findings

[Phase 0 requirements](phase-0-upstream-audit.md) · [Task tracker](../../PLAN_TRACKING.md#phase-0--upstream-audit)

This file records the first verified upstream findings for phase 0. It is
evidence for work in progress, not proof that phase 0 is complete.

## Audit baseline captured on 2026-09-18

| Area | Verified baseline | Evidence |
|---|---|---|
| Nextflow language server | `v26.04.4`; standalone `language-server-all.jar`; Java 17+; stdio transport | [language-server README](https://github.com/nextflow-io/language-server/blob/master/README.md), [release `v26.04.4`](https://github.com/nextflow-io/language-server/releases/tag/v26.04.4), [`NextflowLanguageServer.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/NextflowLanguageServer.java) |
| Official editor integration | `nextflow-io/vscode-language-nextflow` `1.7.2`; VS Code `^1.96.0`; `vscode-languageclient` `^10.1.0` | [extension `package.json`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/package.json), [extension README](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/README.md), [Nextflow VS Code docs](https://github.com/nextflow-io/nextflow/blob/master/docs/vscode.mdx) |
| Nextflow core | `v26.04.6`; strict parser enabled by default in 26.04+ | [release `v26.04.6`](https://github.com/nextflow-io/nextflow/releases/tag/v26.04.6), [strict syntax docs](https://github.com/nextflow-io/nextflow/blob/master/docs/strict-syntax.mdx), [`ScriptLoaderFactory.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/ScriptLoaderFactory.groovy) |
| Parameter/schema tooling | `nf-schema` `2.8.0`; Nextflow `>=25.10`; Java 17+ | [nf-schema README](https://github.com/nextflow-io/nf-schema/blob/master/README.md), [release `2.8.0`](https://github.com/nextflow-io/nf-schema/releases/tag/2.8.0) |
| Desktop shell | Tauri `2.9.2` stable; system webviews; dual MIT/Apache-2.0 licensing | [release `tauri-v2.9.2`](https://github.com/tauri-apps/tauri/releases/tag/tauri-v2.9.2), [`crates/tauri/Cargo.toml` at `tauri-v2.9.2`](https://github.com/tauri-apps/tauri/blob/tauri-v2.9.2/crates/tauri/Cargo.toml), [README at `tauri-v2.9.2`](https://github.com/tauri-apps/tauri/blob/tauri-v2.9.2/README.md) |
| Monaco/LSP bridge | `monaco-editor` `0.56.0`; current aligned `monaco-languageclient` line is unreleased `11.0.0-next.3`; latest stable listed is `10.7.0` with `monaco-editor` `0.55.1` | [monaco-editor release `v0.56.0`](https://github.com/microsoft/monaco-editor/releases/tag/v0.56.0), [monaco-languageclient README](https://github.com/TypeFox/monaco-languageclient/blob/main/README.md), [compatibility table](https://github.com/TypeFox/monaco-languageclient/blob/main/docs/versions-and-history.md#monaco-editor--codingamemonaco-vscode-api-compatibility-table) |
| Canvas library | `@xyflow/react` `12.11.6`; MIT | [`@xyflow/react` package.json](https://github.com/xyflow/xyflow/blob/main/packages/react/package.json) |

## Verified findings by phase task

### P0-01 — Nextflow language server

- The server is a standard stdio LSP server (`Launcher.createLauncher(..., System.in, System.out)`), not a websocket service, which fits a Tauri-supervised child process model.
- Advertised standard capabilities are incremental text sync, workspace folders, call hierarchy, code lens, completion, definition, formatting, document links, document symbols, hover, references, semantic tokens, rename, and workspace symbols.
- The server also exposes custom execute-command entries: `nextflow.server.previewDag`, `nextflow.server.previewWorkspace`, `nextflow.server.convertPipelineToTyped`, and `nextflow.server.convertScriptToTyped`.
- No registered code-action or signature-help provider was found in the current capability set.
- Unsaved-buffer support is real through the in-memory file cache and incremental `didOpen`/`didChange` updates, but request behavior is uneven: completion/formatting/custom commands recompile eagerly while definition/hover/references/rename/call hierarchy can lag the debounce window and therefore return stale analysis.
- Graph/structure is not exposed as a standard LSP method; current graph/project features ride custom commands, and `previewWorkspace` returns only a narrow schema (`name`, `type`, `path`, `line`, optional `children`).

Key evidence:

- [`NextflowLanguageServer.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/NextflowLanguageServer.java)
- [`WorkspacePreviewProvider.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/services/script/WorkspacePreviewProvider.java)
- [`LanguageService.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/services/LanguageService.java)
- [`FileCache.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/file/FileCache.java)
- [language-server README](https://github.com/nextflow-io/language-server/blob/master/README.md)

### P0-02 — Official editor integration

- The plan's original repository URL is stale; the active repository is `nextflow-io/vscode-language-nextflow`.
- The extension launches the language server through `vscode-languageclient` over stdio, downloads the latest matching patch release into `~/.nextflow/lsp/<version>`, and falls back to the local cache when GitHub is unavailable.
- Java 17+ is required unless a native language-server binary is already present in the same cache directory.
- The extension restarts the server when `nextflow.java.home` or `nextflow.languageVersion` changes and provides explicit restart/stop commands for recovery.
- DAG preview is not a generic editor graph layer: the extension calls the server command `nextflow.server.previewDag`; the project webview calls `nextflow.server.previewWorkspace`.
- The project webview supplements official data with local regex parsing of `.nf.test` files, so not all structure shown in the extension is coming from the language server.
- The current extension appears to refresh its project view from save/file events rather than from every unsaved edit, so server support for unsaved buffers does not automatically mean every editor-side overview stays live.

Key evidence:

- [`src/languageServer/index.ts`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/src/languageServer/index.ts)
- [`src/languageServer/utils/fetchLanguageServer.ts`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/src/languageServer/utils/fetchLanguageServer.ts)
- [`src/webview/WebviewProvider/lib/workspace/queryWorkspace.ts`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/src/webview/WebviewProvider/lib/workspace/queryWorkspace.ts)
- [`src/webview/index.ts`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/src/webview/index.ts)
- [extension README](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/README.md)

### P0-03 — Nextflow parser/compiler semantics

- Nextflow now documents the strict parser as the authority used by the language server and `nextflow lint`; in Nextflow 26.04+ it is enabled by default.
- The current strict-parser stack is centered on the shared `nf-lang` module. The ADR describes parse/analyze support for Nextflow-specific AST nodes such as `ScriptNode`, `ProcessNode`, `WorkflowNode`, and `IncludeNode`, plus include resolution, name checking, and only minimal type checking for process/workflow calls.
- There is a real parse/analyze-only path: `ScriptParser` parses sources, recursively resolves modules, captures comments, resolves includes/names, and performs type checking without immediately entering the runtime script-execution path.
- AST/source ranges are real: `PositionConfigureUtils` stamps nodes with start/end line and column information, which is promising for a thin editor adapter.
- Core parsing is still runtime-adjacent in other paths. `ScriptLoaderFactory` chooses parser v1/v2 from `NXF_SYNTAX_PARSER`, and `ScriptLoaderV2` compiles source into script classes and can later execute them with `runScript()`.
- Local include resolution is explicit, but `plugin/...` includes are not resolved semantically to real plugin code in the strict parser; they receive placeholder targets instead, which is a current semantic gap for exact GUI signatures.
- Remote module support in Nextflow 26.04 adds further side effects: runtime `ModuleResolver` can consult the registry, download tarballs, and install them into project storage.
- Runtime workflow diagrams (`-with-dag`, optionally with `-preview`) are useful evidence that Nextflow itself can derive a graph, but they are execution/dataflow artifacts and are not equivalent to the editor preview or to a general-purpose edit API.
- That split is useful for a thin JVM adapter, but it is not yet enough proof that all parser/compiler entry points are safe for untrusted-project analysis without additional session/plugin auditing.

Key evidence:

- [strict parser ADR](https://github.com/nextflow-io/nextflow/blob/master/adr/20250508-strict-syntax-parser.md)
- [`ScriptParser.java`](https://github.com/nextflow-io/nextflow/blob/master/modules/nf-lang/src/main/java/nextflow/script/control/ScriptParser.java)
- [`ResolveIncludeVisitor.java`](https://github.com/nextflow-io/nextflow/blob/master/modules/nf-lang/src/main/java/nextflow/script/control/ResolveIncludeVisitor.java)
- [`PositionConfigureUtils.java`](https://github.com/nextflow-io/nextflow/blob/master/modules/nf-lang/src/main/java/nextflow/script/parser/PositionConfigureUtils.java)
- [strict syntax docs](https://github.com/nextflow-io/nextflow/blob/master/docs/strict-syntax.mdx)
- [`ScriptLoaderFactory.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/ScriptLoaderFactory.groovy)
- [`ScriptLoaderV2.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/parser/v2/ScriptLoaderV2.groovy)
- [`ModuleResolver.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/module/ModuleResolver.groovy)
- [reports docs (`-with-dag`)](https://github.com/nextflow-io/nextflow/blob/master/docs/reports.mdx#workflow-diagram)

### P0-04 — Parameter schemas and nf-core conventions

- `nf-schema` is explicitly a Nextflow plugin for validating pipeline parameters and sample sheets; it is not a general workflow-structure authority.
- `nf-schema` requires Nextflow 25.10+ and Java 17+, and its README recommends version pinning because plugin code is fetched at runtime.
- Current documented scope covers parameter help/summary, parameter validation, sample sheet validation, and typed sample-sheet conversion.
- The current runtime validator is effectively JSON Schema 2020-12 only and layers Nextflow-specific evaluators on top for `file-path`-style formats, `exists`, nested-file `schema`, `uniqueEntries`, lenient typing, and deprecation checks.
- These schema extensions are behavioral, not just descriptive metadata: they can resolve paths, load nested files, validate sample sheets recursively, and fail deprecated-field usage.
- Nextflow typed-parameter support is runtime/session-backed (`ParamsDsl` resolves declared params from CLI/config/default values), so schema/UI work must stay separate from process-port or dataflow inference.
- `nf-schema` itself warns that arbitrary valid JSON Schema may not be portable to UIs and launch tools outside the documented nf-schema conventions.
- `nf-core/tools` is not fully aligned with `nf-schema`: it still straddles `draft-07`/`definitions` and `2020-12`/`$defs`, and the nf-schema migration guide says the plugin is currently not supported by nf-core tooling.
- nf-core module `meta.yml` remains helpful summary metadata for modules, but lint treats it as a consistency document checked against `main.nf`; real runtime behavior still lives in source.
- No evidence yet shows that nf-core module metadata is universally present or authoritative for arbitrary Nextflow projects; keep it optional and supplemental.

Key evidence:

- [nf-schema README](https://github.com/nextflow-io/nf-schema/blob/master/README.md)
- [`JsonSchemaValidator.groovy`](https://github.com/nextflow-io/nf-schema/blob/master/src/main/groovy/nextflow/validation/validators/JsonSchemaValidator.groovy)
- [`CustomEvaluatorFactory.groovy`](https://github.com/nextflow-io/nf-schema/blob/master/src/main/groovy/nextflow/validation/validators/evaluators/CustomEvaluatorFactory.groovy)
- [nf-schema specification](https://github.com/nextflow-io/nf-schema/blob/master/docs/nextflow_schema/nextflow_schema_specification.md)
- [nf-schema samplesheet specification](https://github.com/nextflow-io/nf-schema/blob/master/docs/nextflow_schema/sample_sheet_schema_specification.md)
- [nf-schema migration guide](https://github.com/nextflow-io/nf-schema/blob/master/docs/migration_guide.md)
- [`ParamsDsl.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/ParamsDsl.groovy)
- [`ParamsHelper.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/ParamsHelper.groovy)
- [`nf_core/pipelines/schema.py`](https://github.com/nf-core/tools/blob/master/nf_core/pipelines/schema.py)
- [`nf_core/modules/lint/meta_yml.py`](https://github.com/nf-core/tools/blob/master/nf_core/modules/lint/meta_yml.py)
- [`modules/meta-schema.json`](https://github.com/nf-core/modules/blob/master/modules/meta-schema.json)
- [typed-parameter and VS Code docs](https://github.com/nextflow-io/nextflow/blob/master/docs/vscode.mdx)

### P0-05 — Desktop/editor infrastructure

- Tauri 2 remains a viable baseline because it uses system webviews and explicitly does not require a localhost HTTP server for the application shell.
- The Tauri 2.9.2 crate manifest shows platform-bound dependencies such as WebView2 on Windows and WebKitGTK on Linux, matching the packaging and compatibility concerns already called out in the plan.
- Tauri capability boundaries are explicit but compositional: if one window/webview belongs to multiple capabilities, permissions merge, so high-privilege language-server/process commands should stay isolated.
- Tauri channels are a better fit than generic events for LSP traffic because they are the documented high-throughput streaming primitive; a localhost websocket bridge is unnecessary.
- Monaco is still viable, but the TypeFox compatibility table currently aligns `monaco-editor` `0.56.0` with the unreleased `monaco-languageclient` `11.0.0-next.3`; the latest stable line (`10.7.0`) aligns with `monaco-editor` `0.55.1`.
- Monaco packaging still requires explicit worker setup, and Tauri/WebView CSP constraints mean the safer baseline is bundled assets plus module-worker packaging rather than a remote or `file://` path.
- That version skew means a Monaco path currently requires either a prerelease bridge or a deliberate downgrade/pin, so phase 1 should begin with a small integration spike rather than treating Monaco as already settled.

Key evidence:

- [Tauri README at `tauri-v2.9.2`](https://github.com/tauri-apps/tauri/blob/tauri-v2.9.2/README.md)
- [`crates/tauri/Cargo.toml` at `tauri-v2.9.2`](https://github.com/tauri-apps/tauri/blob/tauri-v2.9.2/crates/tauri/Cargo.toml)
- [monaco-languageclient README](https://github.com/TypeFox/monaco-languageclient/blob/main/README.md)
- [compatibility table](https://github.com/TypeFox/monaco-languageclient/blob/main/docs/versions-and-history.md#monaco-editor--codingamemonaco-vscode-api-compatibility-table)
- [Monaco ESM integration guide](https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md)

## Initial licensing and advisory notes

| Dependency | License | Current note |
|---|---|---|
| Nextflow language server | Apache-2.0 | No blocker found in this pass. |
| Nextflow core | Apache-2.0 | No blocker found in this pass. |
| nf-schema | Apache-2.0 | Treat as an opt-in pinned runtime plugin, not a default bundled dependency. |
| VS Code extension | MIT | No blocker found in this pass. |
| Tauri 2.9.2 / `@tauri-apps/api` 2.9.0 | MIT or Apache-2.0 | Accept with caveats: Linux GTK/WebKit prerequisites remain a packaging/runtime risk; pin exact versions and keep remote-capability scope tight. |
| monaco-editor | MIT | No blocker found in this pass. |
| monaco-languageclient | MIT | Compatibility, not licensing, is the immediate blocker. Stable `10.7.0` aligns with `monaco-editor` `0.55.1`, not `0.56.0`. |
| @xyflow/react | MIT | No blocker found in this pass. |

## P0-07 candidate dependency and supply-chain snapshot

| Dependency | Candidate version | Role | Provenance / advisory note | Current decision |
|---|---|---|---|---|
| Tauri core | `2.9.2` | Runtime platform | Official upstream crate/release; Linux paths still rely on GTK/WebKit stacks and prior Tauri advisories make capability scoping a standing security concern. | Accept with caveats. |
| `@tauri-apps/api` | `2.9.0` | Runtime frontend bridge | Official npm package with provenance attestation; note that package and framework patch versions do not necessarily match one-for-one. | Accept and pin exactly. |
| `monaco-editor` | `0.56.0` | Runtime editor | Official MIT package, but this exact version currently aligns only with unreleased `monaco-languageclient` `11.0.0-next.3`. | Conditional only; blocked unless prerelease bridge risk is accepted. |
| `monaco-languageclient` | `10.7.0` stable | Runtime editor bridge | Official compatibility table pairs the stable line with `monaco-editor` `0.55.1`. No package-specific advisory was surfaced in this pass. | Accept only with a compatible Monaco downgrade, or replace with a different editor path. |
| `@xyflow/react` | `12.11.6` | Runtime canvas | Official npm package with provenance attestation; no blocker found in this pass. | Accept. |
| Nextflow language server | `v26.04.4` | External runtime artifact | Official release JAR over stdio; treat as a managed sidecar/resource, not a normal frontend dependency. | Accept and pin. |
| `nf-schema` | `2.8.0` | Optional runtime plugin | Official plugin docs recommend version pinning and runtime retrieval; keep optional rather than bundled by default. | Accept only as opt-in and pinned. |

Additional notes:

- The advisory pass did not surface a package-specific blocker for Monaco, monaco-languageclient, React Flow, or nf-schema, but that is only a “no readily verifiable advisory found” result, not a formal clean bill of health.
- An official Nextflow security advisory affected core versions up to `26.04.2`; keep any selected Nextflow engine baseline at `26.04.3+`.

## Current architecture implications

1. Keep the Nextflow language server as the first semantic authority for diagnostics, navigation, rename, and lightweight structure.
2. Treat `previewDag`/`previewWorkspace` as useful but editor-specific protocol, not as a stable standard API for all structural extraction/editing needs.
3. If phase 2 needs more than those custom commands provide, add only a thin JVM adapter over official strict-parser entry points and keep parse-time and run-time boundaries explicit.
4. Treat plugin includes as unresolved semantic edges unless a higher-level official service provides real signatures; current core parsing only supplies placeholders.
5. Keep parameter forms schema-aware but separate from process/input/output inference, and prefer native typed params when available.
6. Treat nf-core module metadata as optional summary metadata, not as a compiler-grade or execution-grade source of truth.
7. Prefer a Rust-supervised stdio language-server bridge exposed to the frontend through Tauri commands/channels rather than a localhost websocket service.
8. Treat the Nextflow language server and nf-schema as managed external runtime artifacts, not ordinary frontend package dependencies.
9. Do not lock the frontend to Monaco until a phase-1 spike chooses between prerelease `monaco-languageclient` alignment and a more conservative editor path.

## Remaining blockers before any P0 task is checked complete

- Review upstream tests for invalid/incomplete source, cancellation, and stale-result handling in the language server.
- Verify source-range and module-resolution coverage for all editable constructs the GUI needs.
- Audit plugin and parser initialization side effects more deeply before treating a custom JVM adapter as safe for untrusted projects.
- Account for unresolved plugin-include semantics and minimal strict-parser type checking for process/workflow calls when defining the supported visual-editing subset.
- Decide how to handle JSON Schema dialect mismatches between nf-schema and nf-core tooling in any parameter-form UX.
- Finish transitive/provenance review for the direct dependency set and decide whether the Monaco path should downgrade to a stable compatible matrix or accept prerelease bridge risk.
- Convert these findings into the full feature-to-semantics/edit-path matrix required for P0-06 and P0-08.
