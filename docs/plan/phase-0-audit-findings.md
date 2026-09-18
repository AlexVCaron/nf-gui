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
- Unsaved-buffer support is plausible through `didOpen`/`didChange` incremental updates, but this phase still needs explicit test evidence for stale-result and partial-parse behavior before the task can be checked complete.
- Graph/structure is not exposed as a standard LSP method; current graph/project features ride editor-specific commands.

Key evidence:

- [`NextflowLanguageServer.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/NextflowLanguageServer.java)
- [`WorkspacePreviewProvider.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/services/script/WorkspacePreviewProvider.java)
- [language-server README](https://github.com/nextflow-io/language-server/blob/master/README.md)

### P0-02 — Official editor integration

- The plan's original repository URL is stale; the active repository is `nextflow-io/vscode-language-nextflow`.
- The extension launches the language server through `vscode-languageclient` over stdio, downloads the latest matching patch release into `~/.nextflow/lsp/<version>`, and falls back to the local cache when GitHub is unavailable.
- Java 17+ is required unless a native language-server binary is already present in the same cache directory.
- The extension restarts the server when `nextflow.java.home` or `nextflow.languageVersion` changes and provides explicit restart/stop commands for recovery.
- DAG preview is not a generic editor graph layer: the extension calls the server command `nextflow.server.previewDag`; the project webview calls `nextflow.server.previewWorkspace`.
- The project webview supplements official data with local regex parsing of `.nf.test` files, so not all structure shown in the extension is coming from the language server.

Key evidence:

- [`src/languageServer/index.ts`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/src/languageServer/index.ts)
- [`src/languageServer/utils/fetchLanguageServer.ts`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/src/languageServer/utils/fetchLanguageServer.ts)
- [`src/webview/WebviewProvider/lib/workspace/queryWorkspace.ts`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/src/webview/WebviewProvider/lib/workspace/queryWorkspace.ts)
- [extension README](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/README.md)

### P0-03 — Nextflow parser/compiler semantics

- Nextflow now documents the strict parser as the authority used by the language server and `nextflow lint`; in Nextflow 26.04+ it is enabled by default.
- Core parsing is still runtime-adjacent. `ScriptLoaderFactory` chooses parser v1/v2 from `NXF_SYNTAX_PARSER`, and `ScriptLoaderV2` compiles source into script classes and can later execute them with `runScript()`.
- That split is useful for a thin JVM adapter, but it is not yet enough proof that all parser/compiler entry points are safe for untrusted-project analysis without additional session/plugin auditing.
- Runtime workflow diagrams (`-with-dag`, optionally with `-preview`) are useful evidence that Nextflow itself can derive a graph, but they are not equivalent to the editor preview or to a general-purpose edit API.

Key evidence:

- [strict syntax docs](https://github.com/nextflow-io/nextflow/blob/master/docs/strict-syntax.mdx)
- [`ScriptLoaderFactory.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/ScriptLoaderFactory.groovy)
- [`ScriptLoaderV2.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/parser/v2/ScriptLoaderV2.groovy)
- [reports docs (`-with-dag`)](https://github.com/nextflow-io/nextflow/blob/master/docs/reports.mdx#workflow-diagram)

### P0-04 — Parameter schemas and nf-core conventions

- `nf-schema` is explicitly a Nextflow plugin for validating pipeline parameters and sample sheets; it is not a general workflow-structure authority.
- `nf-schema` requires Nextflow 25.10+ and Java 17+, and its README recommends version pinning because plugin code is fetched at runtime.
- Current documented scope covers parameter help/summary, parameter validation, sample sheet validation, and typed sample-sheet conversion.
- Nextflow typed-parameter support is runtime/session-backed (`ParamsDsl` resolves declared params from CLI/config/default values), so schema/UI work must stay separate from process-port or dataflow inference.
- No evidence yet shows that nf-core module metadata is universally present or authoritative for arbitrary Nextflow projects; keep it optional and supplemental.

Key evidence:

- [nf-schema README](https://github.com/nextflow-io/nf-schema/blob/master/README.md)
- [`ParamsDsl.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/ParamsDsl.groovy)
- [typed-parameter and VS Code docs](https://github.com/nextflow-io/nextflow/blob/master/docs/vscode.mdx)

### P0-05 — Desktop/editor infrastructure

- Tauri 2 remains a viable baseline because it uses system webviews and explicitly does not require a localhost HTTP server for the application shell.
- The Tauri 2.9.2 crate manifest shows platform-bound dependencies such as WebView2 on Windows and WebKitGTK on Linux, matching the packaging and compatibility concerns already called out in the plan.
- Monaco is still viable, but the TypeFox compatibility table currently aligns `monaco-editor` `0.56.0` with the unreleased `monaco-languageclient` `11.0.0-next.3`; the latest stable line (`10.7.0`) aligns with `monaco-editor` `0.55.1`.
- That version skew means a Monaco path currently requires either a prerelease bridge or a deliberate downgrade/pin, so phase 1 should begin with a small integration spike rather than treating Monaco as already settled.

Key evidence:

- [Tauri README at `tauri-v2.9.2`](https://github.com/tauri-apps/tauri/blob/tauri-v2.9.2/README.md)
- [`crates/tauri/Cargo.toml` at `tauri-v2.9.2`](https://github.com/tauri-apps/tauri/blob/tauri-v2.9.2/crates/tauri/Cargo.toml)
- [monaco-languageclient README](https://github.com/TypeFox/monaco-languageclient/blob/main/README.md)
- [compatibility table](https://github.com/TypeFox/monaco-languageclient/blob/main/docs/versions-and-history.md#monaco-editor--codingamemonaco-vscode-api-compatibility-table)

## Initial licensing and advisory notes

| Dependency | License | Current note |
|---|---|---|
| Nextflow language server | Apache-2.0 | No blocker found in this pass. |
| Nextflow core | Apache-2.0 | No blocker found in this pass. |
| nf-schema | Apache-2.0 | No blocker found in this pass. |
| VS Code extension | MIT | No blocker found in this pass. |
| Tauri 2.9.2 | MIT or Apache-2.0 | Release audit includes RustSec warnings in the Linux GTK/WebKit dependency stack; treat Linux packaging as a tracked risk, not a solved dependency decision. |
| monaco-editor | MIT | No blocker found in this pass. |
| monaco-languageclient | MIT | Compatibility, not licensing, is the immediate blocker. |
| @xyflow/react | MIT | No blocker found in this pass. |

## Current architecture implications

1. Keep the Nextflow language server as the first semantic authority for diagnostics, navigation, rename, and lightweight structure.
2. Treat `previewDag`/`previewWorkspace` as useful but editor-specific protocol, not as a stable standard API for all structural extraction/editing needs.
3. If phase 2 needs more than those custom commands provide, add only a thin JVM adapter over official Nextflow parser/compiler entry points and keep parse-time and run-time boundaries explicit.
4. Keep parameter forms schema-aware but separate from process/input/output inference.
5. Do not lock the frontend to Monaco until a phase-1 spike chooses between prerelease `monaco-languageclient` alignment and a more conservative editor path.

## Remaining blockers before any P0 task is checked complete

- Review upstream tests for invalid/incomplete source, cancellation, and stale-result handling in the language server.
- Verify source-range and module-resolution coverage for all editable constructs the GUI needs.
- Audit plugin and parser initialization side effects more deeply before treating a custom JVM adapter as safe for untrusted projects.
- Finish advisory/provenance/transitive reviews for the direct dependency set, not just headline licenses and release notes.
- Convert these findings into the full feature-to-semantics/edit-path matrix required for P0-06 and P0-08.
