# Phase 0 audit findings

[Phase 0 requirements](phase-0-upstream-audit.md) · [Task tracker](../../PLAN_TRACKING.md#phase-0--upstream-audit)

This file records the first verified upstream findings for phase 0. It is
evidence for work in progress, not proof that phase 0 is complete.

The selected compatibility line and the versioned P0-06/P0-08 matrix now live
in [phase-0-capability-matrix.md](phase-0-capability-matrix.md).

## Audit baseline captured on 2026-09-18

| Area | Verified baseline | Evidence |
|---|---|---|
| Nextflow language server | `v26.04.4`; standalone `language-server-all.jar`; Java 17+; stdio transport | [language-server README](https://github.com/nextflow-io/language-server/blob/master/README.md), [release `v26.04.4`](https://github.com/nextflow-io/language-server/releases/tag/v26.04.4), [`NextflowLanguageServer.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/NextflowLanguageServer.java) |
| Official editor integration | `nextflow-io/vscode-language-nextflow` `1.7.2`; VS Code `^1.96.0`; `vscode-languageclient` `^10.1.0` | [extension `package.json`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/package.json), [extension README](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/README.md), [Nextflow VS Code docs](https://github.com/nextflow-io/nextflow/blob/master/docs/vscode.mdx) |
| Nextflow core | `v26.04.6`; strict parser enabled by default in 26.04+ | [release `v26.04.6`](https://github.com/nextflow-io/nextflow/releases/tag/v26.04.6), [strict syntax docs](https://github.com/nextflow-io/nextflow/blob/master/docs/strict-syntax.mdx), [`ScriptLoaderFactory.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/ScriptLoaderFactory.groovy) |
| Parameter/schema tooling | `nf-schema` `2.8.0`; Nextflow `>=25.10`; Java 17+ | [nf-schema README](https://github.com/nextflow-io/nf-schema/blob/master/README.md), [release `2.8.0`](https://github.com/nextflow-io/nf-schema/releases/tag/2.8.0) |
| Desktop shell | Tauri `2.9.2` was the initial candidate; reject it for Windows/Android due to GHSA-7gmj-67g7-phm9 and use at least `2.11.1` | [Tauri 2.9.2 crate record](https://crates.io/api/v1/crates/tauri/2.9.2), [advisory with fixed version](https://github.com/advisories/GHSA-7gmj-67g7-phm9) |
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
- Version-pinned tests in `v26.04.4` cover a basic incomplete `workflow {` diagnostic and clearing that diagnostic after a fix; they do not establish broad behavior during malformed edit sequences. The inspected diagnostics publisher does not attach a document version, so clients cannot use the LSP diagnostic version field to reject stale diagnostics.
- In the selected `v26.04.4` release, request wrappers check cancellation before dispatching to service handlers; the inspected path does not establish cooperative cancellation during analysis. Document updates are debounced and freshness varies by request family. Update failures are caught, but automatic retry or guaranteed diagnostic recovery was not established.
- Stronger tests on language-server commit `126aaafbdf3cccb00c965e51495dad63f9930c23` cover cancellation during requests and workspace builds, stale position requests, versioned diagnostics, per-file failures, and retry/recovery. This is newer `main`, not the selected `v26.04.4` baseline, and must not be used to claim those guarantees for the pinned artifact.
- Server-internal recovery is distinct from process restart: current `main` tests orderly shutdown and failure containment, but no real child-process crash/restart and document-resynchronization test was found. The official extension provides manual and configuration-triggered restart behavior; failed startup reports an error, and failed stop offers a window reload. Automatic crash recovery was not established.

Key evidence:

- [`NextflowLanguageServer.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/NextflowLanguageServer.java)
- [`WorkspacePreviewProvider.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/services/script/WorkspacePreviewProvider.java)
- [`LanguageService.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/services/LanguageService.java)
- [`FileCache.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/file/FileCache.java)
- [`ScriptDiagnosticsTest.groovy` at `v26.04.4`](https://github.com/nextflow-io/language-server/blob/v26.04.4/src/test/groovy/nextflow/lsp/services/script/ScriptDiagnosticsTest.groovy)
- [`EngineTest.java` at `126aaafb`](https://github.com/nextflow-io/language-server/blob/126aaafbdf3cccb00c965e51495dad63f9930c23/src/test/java/nextflow/lsp/engine/EngineTest.java)
- [`WorkspaceBuildTest.java` at `126aaafb`](https://github.com/nextflow-io/language-server/blob/126aaafbdf3cccb00c965e51495dad63f9930c23/src/test/java/nextflow/lsp/engine/WorkspaceBuildTest.java)
- [`LanguageServerWiringTest.java` at `126aaafb`](https://github.com/nextflow-io/language-server/blob/126aaafbdf3cccb00c965e51495dad63f9930c23/src/test/java/nextflow/lsp/LanguageServerWiringTest.java)
- [`NextflowLanguageServerTest.java` at `126aaafb`](https://github.com/nextflow-io/language-server/blob/126aaafbdf3cccb00c965e51495dad63f9930c23/src/test/java/nextflow/lsp/NextflowLanguageServerTest.java)
- [Official extension server lifecycle at `1a28fdb`](https://github.com/nextflow-io/vscode-language-nextflow/blob/1a28fdb18f435a7e62606e89623e753a2301e786/src/languageServer/index.ts)
- [language-server README](https://github.com/nextflow-io/language-server/blob/master/README.md)

### P0-02 — Official editor integration

- The plan's original repository URL is stale; the active repository is `nextflow-io/vscode-language-nextflow`.
- The extension launches the language server through `vscode-languageclient` over stdio, downloads the latest matching patch release into `~/.nextflow/lsp/<version>`, and falls back to the local cache when GitHub is unavailable.
- Java 17+ is required unless a native language-server binary is already present in the same cache directory.
- The extension restarts the server when `nextflow.java.home` or `nextflow.languageVersion` changes and provides explicit restart/stop commands for recovery.
- These are manual and configuration-triggered recovery paths; the inspected extension evidence does not establish automatic restart after a child-process crash or recovery of open-buffer state after restart.
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
- Those generic AST positions do not establish an exact editable-range contract. The audited `v26.04.6` parser tests check parser/diagnostic behavior but do not assert source slices or round-trip edits for the required declarations, input/output items, invocation arguments, aliases, and literal expressions; even token and AST position conventions differ. Exact ranges for the proposed edit subset therefore remain unproven.
- `plugin/...` includes receive placeholder function targets instead of resolved plugin signatures. A newer `nf-lang` test confirms that a typed script can call a plugin function and use its dynamically typed result without errors; this establishes permissive placeholder behavior, not known arguments, types, outputs, or editable ports. Keep such calls opaque for signature-dependent GUI operations.
- `ScriptParser` exposes public parse/analyze/compiler entry points, but the audited sources provide no versioned compatibility guarantee. A pinned adapter must isolate these APIs and verify each supported Nextflow version.
- The audited parse/analyze API does not resolve effective runtime configuration precedence. Do not present parser output as resolved configuration; configuration-sensitive UI remains a separate, explicitly authorized operation.
- Remote include analysis can delegate through a service-loaded resolver to Nextflow runtime module resolution, which may contact a registry, download, and install modules. Ordinary inspection must disable or gate remote resolution and constrain local file access independently, including symlinks. `analyze()` is not established as side-effect-free for untrusted projects.
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
- [`PositionConfigureUtils.java` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nf-lang/src/main/java/nextflow/script/parser/PositionConfigureUtils.java)
- [`ScriptAstBuilderTest.groovy` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nf-lang/src/test/groovy/nextflow/script/parser/ScriptAstBuilderTest.groovy)
- [`ResolveIncludeVisitor.java` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nf-lang/src/main/java/nextflow/script/control/ResolveIncludeVisitor.java)
- [`ResolveIncludeTest.groovy` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nf-lang/src/test/groovy/nextflow/script/control/ResolveIncludeTest.groovy)
- [`ScriptParser.java` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nf-lang/src/main/java/nextflow/script/control/ScriptParser.java)
- [`Compiler.java` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nf-lang/src/main/java/nextflow/script/control/Compiler.java)
- [`ModuleResolver.java` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nf-lang/src/main/java/nextflow/script/control/ModuleResolver.java)
- [`RemoteModuleResolverProvider.java` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nf-lang/src/main/java/nextflow/module/spi/RemoteModuleResolverProvider.java)
- [`DefaultRemoteModuleResolver.groovy` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/module/DefaultRemoteModuleResolver.groovy)
- [`ModuleResolver.groovy` at Nextflow `v26.04.6`](https://github.com/nextflow-io/nextflow/blob/232b60569865e9a4577e48c1955409238359d6ca/modules/nextflow/src/main/groovy/nextflow/module/ModuleResolver.groovy)
- [`ResolveIncludeVisitor.java` at Nextflow `main` commit `122b8944`](https://github.com/nextflow-io/nextflow/blob/122b8944b92d1432c4e17af7d5c55cbae36444ec/modules/nf-lang/src/main/java/nextflow/script/control/ResolveIncludeVisitor.java)
- [`ResolveIncludeTest.groovy` at Nextflow `main` commit `122b8944`](https://github.com/nextflow-io/nextflow/blob/122b8944b92d1432c4e17af7d5c55cbae36444ec/modules/nf-lang/src/test/groovy/nextflow/script/control/ResolveIncludeTest.groovy)
- [Strict-parser ADR](https://github.com/nextflow-io/nextflow/blob/master/docs/adr/20250508-strict-syntax-parser.md)
- [`ScriptLoaderFactory.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/ScriptLoaderFactory.groovy)
- [`ScriptLoaderV2.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/parser/v2/ScriptLoaderV2.groovy)
- [`ModuleResolver.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/module/ModuleResolver.groovy)
- [reports docs (`-with-dag`)](https://github.com/nextflow-io/nextflow/blob/master/docs/reports.mdx#workflow-diagram)

### P0-04 — Parameter schemas and nf-core conventions

- `nf-schema` is explicitly a Nextflow plugin for validating pipeline parameters and sample sheets; it is not a general workflow-structure authority.
- The `nf-schema` 2.8.0 README states Nextflow 25.10+ and Java 17+, but its tagged build targets Nextflow 26.04.0 and registry metadata reports a 26.04.0 minimum. Treat 26.04.0 as the conservative minimum until upstream reconciles the discrepancy; plugin code is fetched at runtime and should be pinned.
- Current documented scope covers parameter help/summary, parameter validation, sample sheet validation, and typed sample-sheet conversion.
- The inspected current runtime validator (nf-schema commit `c3986df`) is effectively JSON Schema 2020-12 only and layers Nextflow-specific evaluators on top for `file-path`-style formats, `exists`, nested-file `schema`, `uniqueEntries`, lenient typing, and deprecation checks.
- These schema extensions are behavioral, not just descriptive metadata: they can resolve paths, load nested files, validate sample sheets recursively, and fail deprecated-field usage.
- Nextflow typed-parameter support is runtime/session-backed (`ParamsDsl` resolves declared params from CLI/config/default values), so schema/UI work must stay separate from process-port or dataflow inference.
- `nf-schema` itself warns that arbitrary valid JSON Schema may not be portable to UIs and launch tools outside the documented nf-schema conventions.
- `nf-core/tools` is not fully aligned with `nf-schema`: it still straddles `draft-07`/`definitions` and `2020-12`/`$defs`, and the nf-schema migration guide says the plugin is currently not supported by nf-core tooling.
- nf-core module `meta.yml` remains helpful summary metadata for modules, but lint treats it as a consistency document checked against `main.nf`; real runtime behavior still lives in source.
- No evidence yet shows that nf-core module metadata is universally present or authoritative for arbitrary Nextflow projects; keep it optional and supplemental.
- **Parameter-form decision:** read the schema dialect from its declared `$schema`; render explicitly supported Draft 7 and 2020-12 metadata separately, and label missing/unknown dialects rather than guessing or rewriting them. Display schema values with file provenance; defaults are hints, not effective values, and required markers do not prove runtime resolution.
- Do not claim values are nf-schema-validated unless the project's pinned plugin actually performed validation. Treat nf-schema keywords such as `exists`, nested `schema`, `uniqueEntries`, and deprecation as declared constraints unless their official runtime semantics are explicitly invoked with user authorization. Do not inspect files, resolve remote references, validate samplesheets, or execute plugin code just to open a project.
- Keep Nextflow typed parameter declarations distinct from JSON Schema metadata and from effective CLI/config/default values. Do not infer process ports from schemas or nf-core metadata.
- The inspected nf-schema migration guide conflicts with newer nf-core/tools code that selects a schema dialect and ships an nf-schema-oriented template. Record this as partial/evolving compatibility; do not assume universal interoperability or promise automatic, semantics-preserving conversion.

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
- [nf-schema `JsonSchemaValidator.groovy` at commit `c3986df`](https://github.com/nextflow-io/nf-schema/blob/c3986dfbf08ca076f1d27b20cd829f67edcce001/src/main/groovy/nextflow/validation/validators/JsonSchemaValidator.groovy)
- [nf-schema migration guide at commit `c3986df`](https://github.com/nextflow-io/nf-schema/blob/c3986dfbf08ca076f1d27b20cd829f67edcce001/docs/migration_guide.md)
- [nf-core/tools `schema.py` at commit `9ae33b4`](https://github.com/nf-core/tools/blob/9ae33b4229f39a185af5e074bdd94e45471f4a9b/nf_core/pipelines/schema.py)
- [Nextflow typed parameters at commit `122b8944`](https://github.com/nextflow-io/nextflow/blob/122b8944b92d1432c4e17af7d5c55cbae36444ec/docs/typed-parameters.mdx)

### P0-05 — Desktop/editor infrastructure

- Tauri 2 remains a viable desktop-shell candidate because it uses system webviews; its target-specific WebView dependencies and resource/sidecar mechanisms must be reflected in packaging and platform support.
- Tauri capability boundaries are compositional: permissions from capabilities assigned to the same webview merge. Keep high-privilege language-server/process commands isolated and avoid granting the frontend general shell access.
- Tauri channels fit high-throughput LSP traffic; a localhost websocket bridge is unnecessary for the app shell.
- The TypeFox compatibility table documents a stable compatible set: `monaco-editor` `0.55.1`, `monaco-languageclient` `10.7.0`, and `@codingame/monaco-vscode-api` `25.1.2`. Newer TypeFox documentation reports `11.0.3` but its compatibility table still labels that row unreleased; retain the documented stable set as a conservative spike baseline, not a claim that it is the latest.
- Monaco's Vite ESM guide supports bundled module workers, but does not prove they work in a packaged Tauri WebView under the production CSP. TypeFox's documented client example uses WebSocket; a Tauri IPC/channel-to-stdio transport is not provided as an established adapter. Both require a phase-1 production-mode spike.
- Package the language-server JAR as an app resource if selected; Tauri `externalBin` is for executable sidecars.
- GitHub Advisory GHSA-7gmj-67g7-phm9 reports Tauri Rust crate versions `2.0.0` through `2.11.0` affected on Windows and Android, with `2.11.1` first patched. Candidate `2.9.2` is rejected; crates.io metadata verifies `2.11.1` as a published release and gives its checksum. Recheck advisories and target support before scaffolding. The advisory database tool returned no vulnerabilities for the submitted version set, so that result conflicts with this direct advisory record and must not override its explicit affected/fixed range.

Key evidence:

- [Tauri README at `tauri-v2.9.2`](https://github.com/tauri-apps/tauri/blob/tauri-v2.9.2/README.md)
- [`crates/tauri/Cargo.toml` at `tauri-v2.9.2`](https://github.com/tauri-apps/tauri/blob/tauri-v2.9.2/crates/tauri/Cargo.toml)
- [monaco-languageclient README](https://github.com/TypeFox/monaco-languageclient/blob/main/README.md)
- [compatibility table](https://github.com/TypeFox/monaco-languageclient/blob/main/docs/versions-and-history.md#monaco-editor--codingamemonaco-vscode-api-compatibility-table)
- [Monaco ESM integration guide](https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md)
- [Tauri v2 capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri v2 CSP](https://v2.tauri.app/security/csp/)
- [Tauri v2 resources](https://v2.tauri.app/develop/resources/)
- [Tauri v2 sidecars](https://v2.tauri.app/develop/sidecar/)
- [Tauri advisory GHSA-7gmj-67g7-phm9](https://github.com/advisories/GHSA-7gmj-67g7-phm9)
- [Tauri `2.11.1` release](https://github.com/tauri-apps/tauri/releases/tag/tauri-v2.11.1)
- [TypeFox compatibility table at commit `0153fb5`](https://github.com/TypeFox/monaco-languageclient/blob/0153fb57a00914e689fd4233127a58e7c5edd051/docs/versions-and-history.md#monaco-editor--codingame-monaco-vscode-api-compatibility-table)
- [TypeFox 10.7.0 changelog at commit `0153fb5`](https://github.com/TypeFox/monaco-languageclient/blob/0153fb57a00914e689fd4233127a58e7c5edd051/packages/client/CHANGELOG.md)
- [Monaco 0.55.1 ESM/Vite guide](https://github.com/microsoft/monaco-editor/blob/v0.55.1/docs/integrate-esm.md)
- [Tauri frontend channels](https://v2.tauri.app/develop/calling-frontend/)
- [TypeFox client README at commit `0153fb5`](https://github.com/TypeFox/monaco-languageclient/blob/0153fb57a00914e689fd4233127a58e7c5edd051/packages/client/README.md)

## Initial licensing and advisory notes

| Dependency | License | Current note |
|---|---|---|
| Nextflow language server | Apache-2.0 | No blocker found in this pass. |
| Nextflow core | Apache-2.0 | No blocker found in this pass. |
| nf-schema | Apache-2.0 | Treat as an opt-in pinned runtime plugin, not a default bundled dependency. |
| VS Code extension | MIT | No blocker found in this pass. |
| Tauri core `2.9.2` | MIT or Apache-2.0 | Rejected for Windows/Android: affected by GHSA-7gmj-67g7-phm9; use at least `2.11.1` and re-audit. |
| `@tauri-apps/api` 2.9.0 | MIT or Apache-2.0 | Exact npm artifact metadata advertises registry signatures and SLSA provenance; pairing with the updated Tauri core must be validated during scaffolding. |
| `monaco-editor` `0.55.1` | MIT | Advisory database query returned no finding; this is not an independent clean bill of health. |
| `monaco-languageclient` `10.7.0` | MIT | Stable compatibility table pairs it with `monaco-editor` `0.55.1`; runtime dependency graph still requires a lockfile. |
| `@xyflow/react` `12.11.6` | MIT | Advisory database query returned no finding; this is not an independent clean bill of health. |

## P0-07 candidate dependency and supply-chain snapshot

| Dependency | Candidate version | Role | Provenance / advisory note | Current decision |
|---|---|---|---|---|
| Tauri core | `2.11.1` candidate | Runtime platform | Crates.io records SHA-256 `b93bd86d231f0a8138f11a02a584769fe4b703dc36ae133d783228dbc4801405`, Apache-2.0 OR MIT; GHSA-7gmj-67g7-phm9 identifies this as first patched. Advisory database tool returned no findings for this submitted version. | Reject `2.9.2`; retain `2.11.1` candidate and recheck advisory/target support when scaffolding begins. |
| `@tauri-apps/api` | `2.9.0` | Runtime frontend bridge | npm registry metadata publishes SRI, registry signature, and a SLSA provenance endpoint; exact pairing with updated Rust crate remains to be tested. | Candidate; verify pair and lock it in the application manifest. |
| `monaco-editor` | `0.55.1` | Runtime editor | npm registry metadata publishes an SRI digest and registry signature; declared runtime dependencies include `marked` and `dompurify`. | Retain for the conservative stable compatibility set. |
| `monaco-languageclient` | `10.7.0` | Runtime editor bridge | npm metadata publishes SRI/signature; declared runtime dependencies include LSP/client packages, `vscode-ws-jsonrpc`, and version-ranged Codingame packages. | Retain only with `monaco-editor` `0.55.1`; lock complete graph. |
| `@codingame/monaco-vscode-api` | `25.1.2` | Runtime VS Code-compatibility layer | npm registry metadata publishes SRI, signature, and SLSA provenance endpoint; runtime dependencies include Codingame service overrides. | Compatible matrix entry; validate exact transitive set and attestation during lockfile generation. |
| `@xyflow/react` | `12.11.6` | Runtime canvas | npm metadata publishes SRI/signature and a provenance endpoint; declared runtime dependencies include `zustand`, `classcat`, and `@xyflow/system`, with React as a peer. | Candidate; lock the complete graph and verify provenance. |
| Nextflow language server | `v26.04.4` | External Java runtime artifact | Tag resolves to `3abf57f952eddf7e02e51d382861184c3ed7d24d`; Apache-2.0; release JAR SHA-256/attestation not verified. Build declares `nf-lang`, Groovy, LSP4J, runtime templates/SnakeYAML; no resolved graph. | Candidate; do not download/use until artifact digest is verified. |
| Nextflow core | `26.04.6` | Optional/managed engine runtime | Official tag `232b60569865e9a4577e48c1955409238359d6ca`, Apache-2.0; release checksum `61a755edbed743cfbb568f3a6c67af68481a2f6a4d6dffcc4295e51318968281`; above known `26.04.3` advisory fix. | Accept as audited semantic baseline, not a forced project upgrade. |
| `nf-schema` | `2.8.0` | Optional runtime plugin | Apache-2.0; release source/build lists runtime libraries, but no plugin artifact digest was verified. Build targets Nextflow `26.04.0`, conflicting with README `25.10.0+` and registry search metadata. | Do not assume compatibility below `26.04.0`; resolve discrepancy and verify artifact before enabling. |

Additional notes:

- The GitHub advisory database tool was run for Tauri `2.9.2` and `2.11.1`, `@tauri-apps/api` `2.9.0`, `@xyflow/react` `12.11.6`, Monaco `0.55.1`, `monaco-languageclient` `10.7.0`, and Codingame API `25.1.2`; it returned “No vulnerabilities found.” Direct GHSA-7gmj-67g7-phm9 nevertheless reports Tauri through `2.11.0` affected. Preserve this discrepancy and use the advisory's explicit affected/fixed ranges for the Tauri decision.
- npm package records provide direct package SRI/signature and, for some packages, a provenance attestation endpoint; these records have not been independently verified and do not replace a resolved lockfile/SBOM.
- No application manifests or lockfiles exist in this repository. Therefore the actual nf-gui transitive graph, complete licenses, feature-selected Rust graph, runtime/development resolution, and scanner findings cannot yet be established. Upstream manifests show declared dependency exposure only.
- An official Nextflow security advisory affected core versions up to `26.04.2`; keep any selected Nextflow engine baseline at `26.04.3+`.

Artifact evidence references:

- [Tauri 2.9.2 crates.io record](https://crates.io/api/v1/crates/tauri/2.9.2)
- [Tauri 2.11.1 crates.io record](https://crates.io/api/v1/crates/tauri/2.11.1)
- [`@tauri-apps/api` 2.9.0 npm record](https://registry.npmjs.org/%40tauri-apps%2Fapi/2.9.0)
- [`@xyflow/react` 12.11.6 npm record](https://registry.npmjs.org/%40xyflow%2Freact/12.11.6)
- [`monaco-editor` 0.55.1 npm record](https://registry.npmjs.org/monaco-editor/0.55.1)
- [`monaco-languageclient` 10.7.0 npm record](https://registry.npmjs.org/monaco-languageclient/10.7.0)
- [`@codingame/monaco-vscode-api` 25.1.2 npm record](https://registry.npmjs.org/%40codingame%2Fmonaco-vscode-api/25.1.2)
- [Language-server v26.04.4 source tag](https://github.com/nextflow-io/language-server/commit/3abf57f952eddf7e02e51d382861184c3ed7d24d) and [tagged Gradle build](https://github.com/nextflow-io/language-server/blob/v26.04.4/build.gradle)
- [Nextflow 26.04.6 checksum file](https://github.com/nextflow-io/nextflow/blob/v26.04.6/nextflow.sha256)
- [`nf-schema` 2.8.0 tagged build](https://github.com/nextflow-io/nf-schema/blob/2.8.0/build.gradle), [README](https://github.com/nextflow-io/nf-schema/blob/2.8.0/README.md), and [registry entry](https://registry.nextflow.io/plugins/nf-schema@2.8.0)

Exact registry digests observed in the package metadata (not independently
verified against downloaded artifacts): Tauri `2.9.2` crate SHA-256
`8bceb52453e507c505b330afe3398510e87f428ea42b6e76ecb6bd63b15965b5`;
Tauri `2.11.1` crate SHA-256
`b93bd86d231f0a8138f11a02a584769fe4b703dc36ae133d783228dbc4801405`;
`@tauri-apps/api` `2.9.0` npm SRI
`sha512-qD5tMjh7utwBk9/5PrTA/aGr3i5QaJ/Mlt7p8NilQ45WgbifUNPyKWsA63iQ8YfQq6R8ajMapU+/Q8nMcPRLNw==`;
`@xyflow/react` `12.11.6` SRI
`sha512-9XsEJNHjatKYndszKTF/bsU7FOP9dJ6V/EQwzy3oMdtqgBuUq7BjKSwkEo+C7s4qHstHQfwwoHA3E8QfpPxZZQ==`;
`monaco-editor` `0.55.1` SRI
`sha512-jz4x+TJNFHwHtwuV9vA9rMujcZRb0CEilTEwG2rRSpe/A7Jdkuj8xPKttCgOh+v/lkHy7HsZ64oj+q3xoAFl9A==`;
`monaco-languageclient` `10.7.0` SRI
`sha512-oA5cOFixkF4bspVL2zMSn48LvlNR/Cu3vJ8MCVam3PdjobSULGgHtOASuZIi3FgWK42X1z8/6hrG0LCjvNu1Hw==`;
and `@codingame/monaco-vscode-api` `25.1.2` SRI
`sha512-K04QcQA+Zb0KXucBAK/BGCT5dldiwIqdUbBQq7yuLvBLbof3cP1WSUuxasMHGYwM0MWyzIAsDtyAYMS7is8ZuA==`.

## Current architecture implications

1. Keep the Nextflow language server as the first semantic authority for diagnostics, navigation, rename, and lightweight structure.
2. Treat `previewDag`/`previewWorkspace` as useful but editor-specific protocol, not as a stable standard API for all structural extraction/editing needs.
3. If phase 2 needs more than those custom commands provide, add only a thin JVM adapter over official strict-parser entry points and keep parse-time and run-time boundaries explicit.
4. Treat plugin includes as unresolved semantic edges unless a higher-level official service provides real signatures; current core parsing only supplies placeholders.
5. Keep parameter forms schema-aware but separate from process/input/output inference, and prefer native typed params when available.
6. Treat nf-core module metadata as optional summary metadata, not as a compiler-grade or execution-grade source of truth.
7. Prefer a Rust-supervised stdio language-server bridge exposed to the frontend through Tauri commands/channels rather than a localhost websocket service.
8. Treat the Nextflow language server and nf-schema as managed external runtime artifacts, not ordinary frontend package dependencies.
9. Keep the stable Monaco `0.55.1` / `monaco-languageclient` `10.7.0` / Codingame `25.1.2` set as the phase-1 spike baseline, subject to lockfile and worker/transport proof.

## Phase 0 disposition and remaining blockers

- **P0-01/P0-02 research is complete:** source and test evidence for the selected release and official extension is recorded, including known limitations. Runtime cancellation, process restart, and document resynchronization are implementation/integration obligations for Phase 1, not guarantees to attribute to upstream.
- **P0-03 research is complete with boundaries:** the parse/analyze path, include behavior, API caveats, and lack of an edit-range contract are documented. Exact edit round trips belong to Phases 2/3; configuration resolution remains explicitly outside the audited parser API.
- **P0-04 decision is complete:** parameter forms must identify provenance/dialect, distinguish declared metadata from official validation and effective values, and avoid running extensions or file checks on project open.
- **P0-05 research is complete with an explicit Phase 1 spike:** the compatible editor set and Tauri boundaries are documented. Packaged WebView worker/CSP and Tauri IPC-to-stdio transport are not proven by upstream docs and must be tested before selecting the final integration.
- **P0-07 remains blocked:** Tauri `2.9.2` is rejected by a direct advisory and `2.11.1` is the first-patched candidate. The language-server JAR digest, nf-schema compatibility discrepancy, full app dependency graph, and lockfile-level transitive/provenance audit remain unresolved because no application manifests exist.
- **P0-EXIT remains open** until P0-07's selected dependency set, artifact provenance, and transitive exposure are resolved and the evidence matrix is reviewed against every initial feature.
