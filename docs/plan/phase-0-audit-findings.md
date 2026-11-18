# Phase 0 audit findings

[Phase 0 requirements](phase-0-upstream-audit.md) · [Task tracker](../../PLAN_TRACKING.md#phase-0--upstream-audit)

This file records the first verified upstream findings for phase 0. It is
evidence for work in progress, not proof that phase 0 is complete.

The selected compatibility line and the versioned P0-06/P0-08 matrix now live
in [phase-0-capability-matrix.md](phase-0-capability-matrix.md).

## Audit baseline captured on 2026-09-18

| Area | Verified baseline | Evidence |
|---|---|---|
| Nextflow language server | `v26.04.4`; standalone `language-server-all.jar`; Java 17+; stdio transport; release-asset SHA-256 verified from GitHub release metadata | [language-server README](https://github.com/nextflow-io/language-server/blob/master/README.md), [release `v26.04.4`](https://github.com/nextflow-io/language-server/releases/tag/v26.04.4), [`NextflowLanguageServer.java`](https://github.com/nextflow-io/language-server/blob/master/src/main/java/nextflow/lsp/NextflowLanguageServer.java) |
| Official editor integration | `nextflow-io/vscode-language-nextflow` `1.7.2`; VS Code `^1.96.0`; `vscode-languageclient` `^10.1.0` | [extension `package.json`](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/package.json), [extension README](https://github.com/nextflow-io/vscode-language-nextflow/blob/main/README.md), [Nextflow VS Code docs](https://github.com/nextflow-io/nextflow/blob/master/docs/vscode.mdx) |
| Nextflow core | `v26.04.6`; strict parser enabled by default in 26.04+ | [release `v26.04.6`](https://github.com/nextflow-io/nextflow/releases/tag/v26.04.6), [strict syntax docs](https://github.com/nextflow-io/nextflow/blob/master/docs/strict-syntax.mdx), [`ScriptLoaderFactory.groovy`](https://github.com/nextflow-io/nextflow/blob/master/modules/nextflow/src/main/groovy/nextflow/script/ScriptLoaderFactory.groovy) |
| Parameter/schema tooling | `nf-schema` `2.8.0`; use Nextflow `26.04.0+` conservatively based on tagged build and registry metadata; README still says `25.10+`; Java 17+ | [nf-schema README](https://github.com/nextflow-io/nf-schema/blob/master/README.md), [release `2.8.0`](https://github.com/nextflow-io/nf-schema/releases/tag/2.8.0), [plugin registry](https://registry.nextflow.io/plugins/nf-schema@2.8.0) |
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
- GitHub Advisory GHSA-7gmj-67g7-phm9 reports Tauri Rust crate versions `2.0.0` through `2.11.0` affected on Windows and Android, with `2.11.1` first patched. The project decision is to retain `2.9.2` for the PoC, but not ship or claim Windows/Android support until upgrading to a patched release and re-auditing. Keep the PoC on bundled trusted content and do not expose external navigation or privileged commands to remote content; this reduces exposure but does not fix the dependency. The advisory database tool returned no vulnerabilities for the submitted version set, so that result conflicts with this direct advisory record and must not override its explicit affected/fixed range.

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
| Tauri core `2.9.2` | MIT or Apache-2.0 | Accepted for the PoC only; affected on Windows/Android by GHSA-7gmj-67g7-phm9. Upgrade to at least `2.11.1` and re-audit before shipping/supporting those targets. |
| `@tauri-apps/api` 2.9.0 | MIT or Apache-2.0 | Exact npm artifact metadata advertises registry signatures and SLSA provenance; deferred from the prototype, so pairing with Tauri `2.9.2` remains unproven. |
| `monaco-editor` `0.57.0` | MIT | Used in the prototype as a plain-text editor only. npm audit initially found vulnerable DOMPurify versions; the lock now overrides to `3.4.18`, which the advisory database did not flag. Recheck after each update. |
| `monaco-languageclient` `10.7.0` | MIT | Stable compatibility table pairs it with Monaco `0.55.1`, but it is not included in the prototype. Trial npm resolution reported affected bridge packages; re-evaluate compatibility and advisories before adding an LSP bridge. |
| `@codingame/monaco-vscode-api` `25.1.2` | MIT | Not included in the prototype. npm audit reported affected versions through `33.0.9`; its suggested `39.0.4` upgrade is a major compatibility change and is not accepted without a new integration review. |
| `@xyflow/react` `12.11.6` | MIT | Advisory database query returned no finding; this is not an independent clean bill of health. |
| React / React DOM `19.1.0` | MIT | Exact direct runtime pins in the prototype lockfile; npm audit did not report a finding. |
| Vite `8.3.8` / `@vitejs/plugin-react` `6.0.2` | MIT | Prototype-only development/build dependencies. npm audit reports five high-severity graph findings through `picomatch` `4.0.7` (`GHSA-fc5q-39xc-vjpf`); no patched picomatch version is available. The dev server is loopback-only; this is an unresolved security blocker, not an accepted clean audit. |
| `@types/node` `26.6.6`, React type packages `19.1.8`/`19.1.6`, TypeScript `6.0.3` | MIT / Apache-2.0 | Exact development pins in the npm lockfile; not part of the production runtime. |
| `@tauri-apps/cli` `2.12.5` | Apache-2.0 or MIT | Exact development pin in the npm lockfile. |
| `dompurify` `3.4.18` | MPL-2.0 or Apache-2.0 | Transitive Monaco dependency pinned by npm override to a version without the observed DOMPurify findings; recheck compatibility and license on updates. |
| `tauri-build` `2.7.5` | MIT or Apache-2.0 | Exact Cargo build dependency; included in the resolved Rust graph. |

## P0-07 candidate dependency and supply-chain snapshot

### Accepted and deferred risks

The user explicitly approved deferring the following risks on 2026-11-18 so
internal PoC/Phase 1 work can continue. This disposition is scoped to
development and local evaluation of the non-shipping PoC. It does **not** make
the advisories false positives, mark scanners clean, or approve a public
release.

| Risk / item | Current disposition | Required action before release or broader use |
|---|---|---|
| npm: five high findings in the Vite 8.3.8 / `tinyglobby` / `fdir` / `picomatch` 4.0.7 graph (`GHSA-fc5q-39xc-vjpf`) | Accepted for local PoC development only. No patched `picomatch` was available; Vite 6.2.7 and 6.4.4 are not safe one-step workarounds. Keep Vite bound to `127.0.0.1`; do not expose its dev server to untrusted networks. | Re-run `npm audit` after lockfile/toolchain changes and before distribution. Replace or remove the affected graph when a suitable patched route exists; document any remaining risk explicitly. |
| RustSec: five warnings in the locked Tauri graph: `chrono` (optional-only), `fxhash`, `proc-macro-error`, `glib`, and `rand` | Accepted/deferred for the PoC only. The optional-only `chrono` lock entry has no active `cargo tree --target all` path; the other four have reachable dependency paths, including platform-specific Tauri dependencies. | Re-run `cargo audit --deny warnings` before distribution and after Cargo updates. Upgrade/remove affected paths where feasible, and record any remaining exception per shipped target. |
| Tauri 2.9.2 GHSA-7gmj-67g7-phm9 | Retained for the PoC only, per user direction. The known Windows/Android impact remains controlling even though scanners missed it. No Windows/Android shipping or support is allowed on this baseline. | Upgrade Tauri to at least 2.11.1, verify the full resolved graph, and re-audit before claiming or shipping Windows/Android support. |
| npm registry signatures/provenance attestations | Lockfile tarball URLs and SRI are recorded, but registry signatures and any available provenance attestations have not been independently verified. Accepted as a PoC-only supply-chain limitation; do not describe the graph as provenance-verified. | Verify package attestations/source provenance for the release graph and record the results before distribution; re-check when registries or package sources change. |
| nf-schema 2.8.0 blob provenance/digest could not be verified because the registry host was unavailable | Deferred and excluded from the PoC runtime; no plugin download, activation, or use is implemented. Its manifest digest and conservative Nextflow 26.04.0+ boundary remain recorded as candidates, not verified artifacts. | Before adding or enabling nf-schema, obtain the artifact from its official registry, verify SHA-256 against the manifest, verify provenance/license, and resolve the documented minimum-version discrepancy. |
| Monaco LSP bridge candidates had unresolved npm advisory/compatibility findings | Deferred; no language-client/Codingame bridge is included in the PoC. | Re-evaluate the smallest compatible bridge with a fresh lockfile and advisory/license review before Phase 1 adopts it. |

These are explicit deferred work items, not waived controls. Re-open P0-07 for
any release candidate, material dependency change, newly patched upstream
release, or new evidence that changes the risk. The prototype remains a
non-shipping UI/build checkpoint.

| Dependency | Candidate version | Role | Provenance / advisory note | Current decision |
|---|---|---|---|---|
| Tauri core | `2.9.2` PoC; `2.11.1` minimum patched candidate | Runtime platform | Locked in `poc/src-tauri/Cargo.lock`; direct GHSA-7gmj-67g7-phm9 says `2.9.2` is affected on Windows/Android. Advisory DB and `cargo-audit` outcomes must not override this explicit finding. | Keep `2.9.2` for prototype only; upgrade and re-audit before Windows/Android shipment or support. |
| Tauri build helper | `tauri-build` `2.7.5` | Build dependency | Exact version in `poc/src-tauri/Cargo.toml`; its advisory database query returned no finding. The generated Rust lockfile resolves 493 third-party packages. | Pinned for reproducible PoC builds; review the full graph before any release decision. |
| React / React DOM | `19.1.0` / `19.1.0` | Runtime UI | Exact direct pins; MIT. `npm` lockfile v3 records resolved tarball URLs and SRI values. | Included and used by the prototype. |
| `monaco-editor` | `0.57.0` | Runtime editor | Exact direct pin; MIT. `npm audit` identified a vulnerable transitive DOMPurify resolution; the lock resolves the reviewed `3.4.18` override. | Included as plain text only; no language server or semantic features. |
| `@xyflow/react` | `12.11.6` | Runtime canvas | Exact direct pin; MIT. `npm` lockfile v3 records the resolved graph and package SRI values. | Included for a static, non-editable sample graph. |
| `@tauri-apps/cli` | `2.12.5` | Build/development tool | Exact direct pin; registry integrity is recorded in `package-lock.json`. | Included as the Tauri build/dev command. |
| TypeScript toolchain | `typescript` `6.0.3`, `@types/node` `26.6.6`, `@types/react` `19.1.8`, `@types/react-dom` `19.1.6`, `@vitejs/plugin-react` `6.0.2` | Development/build tools | Exact pins in the npm manifest/lock; excluded from the runtime-only npm audit. | Included for the prototype frontend build. |
| Vite / React plugin | `8.3.8` / `6.0.2` | Build/development tools | Exact pins; npm audit reports five high-severity findings through `picomatch` `4.0.7`. The advisory review flags Vite `6.2.7` for a dev-server WebSocket file-read issue (through `6.4.1`) and a separate `launch-editor` issue (through `6.4.3`); Vite `6.4.4` addresses those but still declares the affected `picomatch` range. | No Vite-only safe downgrade identified; keep the server bound to `127.0.0.1`, recheck when advisories or lockfile change, and do not ship this baseline. |
| `monaco-languageclient` / Codingame API | `10.7.0` / `25.1.2` | Deferred runtime bridge candidates | A trial resolution produced 50 npm audit findings (44 moderate, 6 high) across 108 packages. npm's proposed major updates (`11.0.3` / `39.0.4`) need new compatibility and advisory review. | Removed from the prototype manifest; no LSP bridge is implemented. |
| `@tauri-apps/api` | `2.9.0` | Deferred runtime bridge candidate | npm registry metadata publishes integrity/signature/provenance information; not included in the prototype, so its Tauri pairing is still unproven. | Add only with a Phase 1 IPC integration and fresh lockfile/advisory review. |
| Nextflow language server | `v26.04.4` | Optional external Java runtime artifact | Tag resolves to `3abf57f952eddf7e02e51d382861184c3ed7d24d`; Apache-2.0; release metadata digest is `e1c5da90c7f0565ba9e64ac3c5b58f1215e315d6bfe4414d62ff2d02749e8887`. Downloaded JAR SHA-256 independently matched this value. | Manifested in `poc/artifacts/manifest.json`; not bundled or executed by the prototype. |
| Nextflow core | `26.04.6` | Optional/managed engine runtime | Official tag `232b60569865e9a4577e48c1955409238359d6ca`, Apache-2.0; release checksum `61a755edbed743cfbb568f3a6c67af68481a2f6a4d6dffcc4295e51318968281`; above known `26.04.3` advisory fix. | Accept as audited semantic baseline, not a forced project upgrade. |
| `nf-schema` | `2.8.0` | Optional runtime plugin | Apache-2.0; registry metadata lists blob SHA-256 `1466fea73502dda8c8059dfe4190be1a857151bc2a500a87a86ffd223918a3f2`; tagged build and registry metadata indicate Nextflow `26.04.0`, while README says `25.10.0+`. Blob download was unavailable from this environment, so local verification remains outstanding. | Manifested but not enabled; keep the conservative `26.04.0+` boundary and verify the downloaded blob before any use. |

Additional notes:

- The GitHub advisory database tool returned no finding for direct Vite `8.3.8`, Monaco `0.57.0`, React `19.1.0`, React DOM `19.1.0`, `@xyflow/react` `12.11.6`, Tauri build helper `2.7.5`, and the tested direct candidates. Lockfile-level `npm audit` nevertheless reports five high-severity Vite/picomatch findings, and the direct Tauri GHSA still controls the Windows/Android gate.
- The npm audit's suggested Vite `6.2.7` downgrade is not a safe one-step resolution: the advisory database also flags Vite through `6.4.1` for the WebSocket file-read issue and through `6.4.3` for the `launch-editor` issue. Vite `6.4.4` depends on `picomatch` `^4.0.2`, still within the current vulnerable range. No patched `picomatch` release was available during this review.
- npm package records provide direct package SRI/signature and, for some packages, a provenance attestation endpoint; these records have not been independently verified and do not replace a resolved lockfile/SBOM.
- The project source is MIT-licensed, declared in the root [LICENSE](../../LICENSE), PoC `package.json`, and Tauri `Cargo.toml`. The current `npm sbom` describes 54 components with declared licenses; `cargo metadata --locked` resolves 494 packages (the prototype plus 493 third-party packages) with declared license expressions. The inventories include MIT, Apache-2.0, ISC, BSD, MPL-2.0, Unicode-3.0, and alternatives that include LGPL-2.1-or-later; these are open-source licenses. Accept them and meet their notice/source obligations. No closed/proprietary license was found in the current resolved inventories. Lockfiles establish versions, registry URLs, and integrity checksums, but do not by themselves establish upstream source provenance.
- The prototype's production-only npm audit reports no vulnerabilities. The full npm audit reports five high findings in development/build dependencies. `cargo audit --deny warnings` denies five RustSec warnings in the 494-package lockfile: unmaintained `chrono` (`RUSTSEC-2026-0543`), `fxhash` (`RUSTSEC-2025-0057`), and `proc-macro-error` (`RUSTSEC-2024-0370`), plus unsoundness advisories for `glib` (`RUSTSEC-2024-0429`) and `rand` (`RUSTSEC-2026-0097`). `chrono` is only an optional `serde_with` lockfile entry and has no active inverse path in `cargo tree --target all`; the other warnings are reachable through Tauri's transitive/platform dependencies. RustSec did not report the separate Tauri GHSA. The project and all current dependency license expressions are declared open-source; attribution, notices, and any source-availability obligations still apply. Registry source attestations have not been independently verified. The artifact manifest records both runtime candidates, but nf-schema remains intentionally deferred and its blob unverified; only the language-server JAR could be downloaded and verified here.
- `npm run audit:dependencies` now executes both npm and Cargo checks even if npm reports a failure, and returns nonzero if either check fails. Its tests cover both the fail-and-continue path and the all-checks-pass path.
- An official Nextflow security advisory affected core versions up to `26.04.2`; keep any selected Nextflow engine baseline at `26.04.3+`.

Artifact evidence references:

- [Tauri 2.9.2 crates.io record](https://crates.io/api/v1/crates/tauri/2.9.2)
- [Tauri 2.11.1 crates.io record](https://crates.io/api/v1/crates/tauri/2.11.1)
- [`@tauri-apps/api` 2.9.0 npm record](https://registry.npmjs.org/%40tauri-apps%2Fapi/2.9.0)
- [`@xyflow/react` 12.11.6 npm record](https://registry.npmjs.org/%40xyflow%2Freact/12.11.6)
- [`monaco-editor` 0.57.0 npm record](https://registry.npmjs.org/monaco-editor/0.57.0)
- [`monaco-languageclient` 10.7.0 npm record](https://registry.npmjs.org/monaco-languageclient/10.7.0)
- [`@codingame/monaco-vscode-api` 25.1.2 npm record](https://registry.npmjs.org/%40codingame%2Fmonaco-vscode-api/25.1.2)
- [Prototype README and update/audit workflow](../../poc/README.md)
- [Prototype npm manifest and lockfile](../../poc/package.json), [Cargo manifest and lockfile](../../poc/src-tauri/Cargo.toml), and [artifact manifest/verifier](../../poc/artifacts/manifest.json)
- [Language-server v26.04.4 source tag](https://github.com/nextflow-io/language-server/commit/3abf57f952eddf7e02e51d382861184c3ed7d24d), [tagged Gradle build](https://github.com/nextflow-io/language-server/blob/v26.04.4/build.gradle), and [release metadata with asset digest](https://api.github.com/repos/nextflow-io/language-server/releases/tags/v26.04.4)
- [Nextflow 26.04.6 checksum file](https://github.com/nextflow-io/nextflow/blob/v26.04.6/nextflow.sha256)
- [`nf-schema` 2.8.0 tagged build](https://github.com/nextflow-io/nf-schema/blob/2.8.0/build.gradle), [README](https://github.com/nextflow-io/nf-schema/blob/2.8.0/README.md), and [registry entry with plugin blob digest](https://registry.nextflow.io/plugins/nf-schema@2.8.0)

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
9. Treat Monaco `0.55.1` / `monaco-languageclient` `10.7.0` / Codingame `25.1.2` as an earlier compatibility candidate, not an approved phase-1 baseline: its trial resolved graph had npm audit findings and must be re-reviewed. The prototype's Monaco `0.57.0` is standalone/plain-text only.

## Phase 0 disposition and remaining blockers

- **P0-01/P0-02 research is complete:** source and test evidence for the selected release and official extension is recorded, including known limitations. Runtime cancellation, process restart, and document resynchronization are implementation/integration obligations for Phase 1, not guarantees to attribute to upstream.
- **P0-03 research is complete with boundaries:** the parse/analyze path, include behavior, API caveats, and lack of an edit-range contract are documented. Exact edit round trips belong to Phases 2/3; configuration resolution remains explicitly outside the audited parser API.
- **P0-04 decision is complete:** parameter forms must identify provenance/dialect, distinguish declared metadata from official validation and effective values, and avoid running extensions or file checks on project open.
- **P0-05 research is complete with an explicit PoC/release boundary:** retain Tauri `2.9.2` for the PoC, but do not ship or claim Windows/Android support until upgrading to a patched Tauri release (at least `2.11.1`) and re-auditing. The compatible editor set and Tauri permissions are documented; packaged WebView worker/CSP and IPC-to-stdio transport remain Phase 1 proofs.
- **P0-07 complete for the scoped non-shipping PoC:** exact npm/Cargo manifests and lockfiles, a package SBOM, artifact verifier, combined audit runner, declared MIT project license, advisory findings, and known provenance limitations are recorded. Current dependency license inventories contain open-source licenses, accepted subject to their notices and source obligations; no closed/proprietary license was found. The user explicitly accepted/deferred the npm and RustSec findings and retained the Tauri 2.9.2 PoC baseline under the constraints in the risk register. nf-schema and the LSP bridge are deferred candidates, not selected or used dependencies. Registry attestations remain unverified. This is a risk disposition, not a clean audit.
- **P0-07 complete for the scoped non-shipping PoC:** exact manifests/lockfiles, SBOM, artifact manifest/verifier, license inventory, and advisory findings are recorded. The user explicitly accepted/deferred the npm and RustSec findings and retained the Tauri 2.9.2 PoC baseline under the constraints above. nf-schema and the LSP bridge are deferred candidates, not selected or used dependencies. This is a risk disposition, not a clean audit.
- **P0-EXIT complete for the audited architecture:** the capability matrix maps initial features to semantic authorities and edit paths; dependency choices and the remaining risks now have explicit owners/triggers. Re-open before release, wider distribution, enabling deferred dependencies, or changing the selected graph.
