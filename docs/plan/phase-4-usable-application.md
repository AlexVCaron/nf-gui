# Phase 4 — First usable application

[Main plan](../../PLAN.md) · [Previous: visual editing](phase-3-visual-editing.md) · [Next: compatibility and packaging](phase-5-compatibility-packaging.md)

## Objective and work

Build the first usable application:

- Project opening.
- Source editor.
- Workflow canvas.
- Component inspector.
- Diagnostics and navigation.
- Basic parameter forms.
- View-only treatment of unsupported constructs.

**Exit criterion:** users can inspect and make supported edits to real pipelines
without abandoning ordinary Nextflow source.

Use the proven document architecture from
[phase 1](phase-1-language-server.md), the disposable semantic projection from
[phase 2](phase-2-structural-extraction.md), and the source-edit transactions and
parameter semantics from [phase 3](phase-3-visual-editing.md).

## Initial release boundaries

### Include

- Open existing Nextflow projects.
- Official diagnostics and navigation.
- Source-backed workflow visualization.
- Definition and invocation inspection.
- Module/include navigation.
- Supported parameter forms.
- A documented subset of safe visual edits.
- Undo/redo and external-change handling.
- Clear compatibility and unsupported-construct indicators.

### Defer

- Arbitrary visual programming for every language construct.
- Runtime expression evaluation in property panels.
- Automatic process-body synthesis.
- A component marketplace.
- Remote execution infrastructure.
- Cloud credentials management.
- Collaborative editing.
- A persistent semantic database.
- Custom plugin execution inside the application.

These features should not distract from proving that visual editing can remain
faithful to Nextflow.
