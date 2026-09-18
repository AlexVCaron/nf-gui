# Plan: a Nextflow-native pipeline development GUI

## Start here

This is the entry point for contributors and agents. The initial plan is split
into the eight phase files below; this overview and those files together
preserve its scope, architecture, dependencies, validation strategy, and risks.
This is a proposal, not a record of completed implementation.

At the time of the initial plan, the repository contained only a heading in
`README.md`. There was no existing application architecture or implementation
to preserve.

**Research limitation:** the initial plan did not verify live upstream source
code or documentation. It is a detailed architectural plan with explicit
verification gates—not the completed web/source audit originally requested.
Links identify primary sources to audit; version-specific capabilities are
deliberately not presented as verified facts. Splitting the plan into files
does not change that evidence status.

## Central recommendation

> Keep Nextflow source files authoritative. Use the Nextflow language server
> for language intelligence, official Nextflow compiler/parser infrastructure
> for any additional structural information, and source edits—not a separately
> maintained pipeline model—for visual editing.

Tauri is a suitable desktop shell. The difficult part is establishing how much
structure and editing support the official Nextflow tooling actually exposes.

## What “no application-owned Nextflow model” means

A GUI necessarily needs some representation of nodes, ports, selections, and
edges. The distinction is whether that representation becomes another
authoritative definition of a pipeline.

### Authoritative artifacts

- Nextflow pipeline and module source.
- Nextflow configuration.
- Parameter schemas, when present.
- Parameter files selected by the user.
- Project dependency and compatibility declarations.
- Official parser/compiler and language-server results derived from those files.

### Permitted application state

Keep only:

- An ephemeral, derived visual representation.
- Source locations and semantic references returned by official tooling.
- Graph layout, viewport, selection, and collapsed groups.
- Unsaved editor buffers.
- Application preferences.
- Explicitly selected execution settings.

### What not to introduce

- A second grammar or parser for Nextflow.
- A canonical JSON pipeline specification that generates all source.
- A separate type-inference or channel-semantics engine.
- A catalogue of component fields maintained independently of source.
- An application-owned interpretation of Nextflow configuration precedence.
- A serializer that rewrites entire pipelines into a restricted visual format.

**Acceptance criterion:** a project must remain fully usable with Nextflow and
ordinary text editors, without application-specific project files. Visual layout
metadata may be disposable; it must not affect execution.

## Architecture in broad strokes

- **Tauri + Rust:** desktop lifecycle, permissions, filesystem access, IPC,
  document coordination, and process supervision.
- **React + TypeScript:** source editor, workflow canvas, inspectors, parameter
  forms, diagnostics, and navigation.
- **Monaco:** preferred source editor, contingent on an integration spike.
- **React Flow:** workflow canvas with one selected layout engine.
- **Official Nextflow language server:** first semantic authority.
- **Minimal JVM adapter:** use official Nextflow parser/compiler infrastructure
  only where supported server APIs are insufficient.
- **Source-edit transactions and disposable projections:** never an
  application-owned pipeline definition.

## Phases

| Phase | Scope | Exit criterion |
|---|---|---|
| [0 — Upstream audit and dependency decisions](docs/plan/phase-0-upstream-audit.md) | Verify official capabilities, inspect upstream code and docs, choose compatible versions, and review every proposed dependency. | Evidence explains how every initial feature obtains semantics and performs edits. |
| [1 — Language-server and editor integration](docs/plan/phase-1-language-server.md) | Connect Tauri to the official server, synchronize documents, and prove diagnostics, navigation, rename, and recovery. | Official language intelligence works with unsaved buffers and cross-file projects. |
| [2 — Structural extraction and visualization](docs/plan/phase-2-structural-extraction.md) | Derive a source-backed graph through official interfaces; add a thin JVM adapter only if needed. | Reproducible structure without a separate parser or semantic engine. |
| [3 — Source-preserving visual edits](docs/plan/phase-3-visual-editing.md) | Implement versioned, minimal source transactions and field/value/component associations. | Round-trip tests prove correctness and preservation of unrelated source. |
| [4 — First usable application](docs/plan/phase-4-usable-application.md) | Assemble project opening, editor, canvas, inspector, diagnostics, navigation, and parameter forms. | Real pipelines can be inspected and safely edited without abandoning ordinary source. |
| [5 — Compatibility, security, validation, and packaging](docs/plan/phase-5-compatibility-packaging.md) | Provision toolchains, enforce trust boundaries, test behavior, and package signed releases. | A clean machine can use the app without undocumented development prerequisites. |
| [6 — Optional execution features](docs/plan/phase-6-execution.md) | Add permissioned runs, logs, cancellation, environment integration, and supported runtime views. | Execution remains separate and unnecessary for ordinary editing. |
| [7 — Broader editing and upstream contributions](docs/plan/phase-7-expansion.md) | Expand the supported editing subset and upstream shared semantic capabilities. | Expand only after semantic and source-editing foundations are proven. |

Security and validation requirements in phase 5 apply throughout development,
not just when packaging begins. Phase 0 contains the full candidate dependency
inventory and its inclusion, exclusion, and alternative rationales.

## Initial release boundaries

**Include:** existing-project opening; official diagnostics and navigation;
source-backed workflow visualization; definition and invocation inspection;
module/include navigation; supported parameter forms; a documented subset of
safe visual edits; undo/redo and external-change handling; and clear
compatibility and unsupported-construct indicators.

**Defer:** arbitrary visual programming for every construct; runtime expression
evaluation in property panels; automatic process-body synthesis; a component
marketplace; remote execution infrastructure; cloud credentials management;
collaborative editing; a persistent semantic database; and custom plugin
execution inside the application.

These features must not distract from proving that visual editing can remain
faithful to Nextflow.

## Decisive next step

Before building the canvas, prove against actual upstream code:

1. How to obtain trustworthy component and relationship structure.
2. How to turn visual intent into source-preserving edits.
3. How to keep both operations aligned with official Nextflow semantics across
   supported versions.

If those proofs succeed, the rest is a conventional desktop IDE project. If
they do not, a polished graph editor would conceal a second, incomplete
implementation of Nextflow—the exact outcome this plan is designed to avoid.
