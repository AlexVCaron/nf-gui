# Phase 2 — Structural extraction and visualization

[Main plan](../../PLAN.md) · [Previous: language-server integration](phase-1-language-server.md) · [Next: visual editing](phase-3-visual-editing.md)

**Required reporting:** update [task status and evidence](../../PLAN_TRACKING.md#phase-2--structural-extraction)
and [CHANGELOG.md](../../CHANGELOG.md) for work on this phase, including partial
progress and blockers; follow the [reporting workflow](../../PLAN.md#required-progress-reporting).

## Objective and work

Prove structural extraction:

- Extract a read-only graph for representative fixtures.
- Use supported server APIs where possible.
- Introduce the thin JVM adapter only if necessary.
- Represent unresolved constructs honestly.

**Exit criterion:** the graph is reproducibly derived from official analysis,
without a separate parser or semantic engine.

## The semantic boundary

The frontend should receive a **read-only, versioned projection** containing
only what it needs to display and select:

- Entity kind.
- Display label.
- Definition or invocation identity.
- Source URI and range.
- References and associations.
- Available type information.
- Diagnostics.
- Whether a relationship is explicit, derived, or unresolved.
- Supported editing operations.

This is a rendering interface, not a replacement Nextflow language model.
It must be possible to discard and regenerate it entirely.

## Choosing the semantic integration strategy

Use the following order of preference.

### Option 1 — Official language server only

Use standard requests plus supported Nextflow-specific extensions.

Advantages:

- Lowest semantic duplication.
- Best alignment with official editor behavior.
- Simplest compatibility story.
- No second parser integration.

Limitations:

- The server may not expose enough structured information.
- It may support navigation but not graph construction or structured edits.

**Decision:** preferred if the capability audit proves it sufficient.

### Option 2 — Official language server plus a thin JVM adapter

Use the official server for language intelligence. Add a small adapter around
the **official** parser/compiler frontend for missing structural information
and narrowly scoped edits.

The adapter must not implement its own grammar or reinterpret the language
independently.

Advantages:

- Preserves official parsing semantics.
- Can expose source-backed structure unavailable through LSP.
- Avoids forcing a general language server into an application-specific protocol.

Costs:

- Internal compiler API compatibility.
- Additional JVM packaging and supervision.
- Possible duplicate parsing and workspace state.
- Need to guarantee that both services analyze identical source versions.

**Decision:** fallback if Option 1 cannot meet the requirements.

The adapter’s language and build system should follow the upstream API, not an
arbitrary preference. Java or Groovy may be appropriate depending on the
selected integration point.

### Option 3 — Contribute structural/editing APIs upstream

Propose missing general-purpose language-server features upstream.

Advantages:

- Benefits other clients.
- Reduces long-term private adapter maintenance.
- Keeps semantics near their official implementation.

Costs:

- Acceptance and release schedules are external.
- Application-specific features may not belong upstream.

**Decision:** pursue alongside Option 2 where the missing capability is broadly
useful.

### Option 4 — Maintain a language-server fork

**Decision:** last resort.

A fork preserves official parsing but creates a continuing maintenance burden.
If unavoidable, keep the patch small, isolated, and designed for upstream
contribution.

### Rejected — Independent Nextflow parser/model

A custom parser, grammar, or canonical graph would directly conflict with the
requirement not to host an application-owned Nextflow model.

## Define “components” and “fields” precisely

The GUI should not treat every Nextflow construct as a generic node with
interchangeable fields.

| Concept | Meaning in the GUI | Authority |
|---|---|---|
| Process definition | Reusable computational component | Official source analysis |
| Workflow definition | Reusable composition boundary | Official source analysis |
| Invocation | A particular use of a component | Resolved source call |
| Input | Formal input declaration | Official source analysis |
| Output | Declared or emitted result | Official source analysis |
| Parameter | Pipeline configuration input | Source, schema, and relevant configuration |
| Directive | Process execution setting | Nextflow language/configuration rules |
| Operator | Channel transformation | Source and official semantic information |
| Configuration setting | Execution configuration | Nextflow configuration |
| UI-only property | Position, selection, collapse state | Disposable application state |

### Distinctions the interface must preserve

- Definitions and invocations are different objects.
- A literal value is different from a channel.
- An expression is different from its evaluated result.
- A schema default is different from a runtime-resolved value.
- A port name is different from an invocation argument.
- A declared type is different from an inferred or unknown type.
- A process directive is not a parameter input.

Avoid a universal “field editor” that erases these distinctions.

## Obtaining and displaying the graph

### Start with a static source-backed graph

Show:

- Workflow boundaries.
- Component invocation instances.
- Explicit references and connections.
- Named outputs where resolvable.
- Operators where structurally supported.
- Module provenance.
- Source navigation.

### Do not claim complete runtime knowledge

Static tooling may not resolve:

- Data-dependent routing.
- Dynamic invocation patterns.
- Arbitrary expressions.
- Runtime-generated configuration.
- Actual task counts.
- Concrete file values.
- Runtime channel contents.

Represent uncertainty explicitly:

- Known relationship.
- Unresolved expression.
- Dynamic region.
- Unsupported construct.
- Stale analysis.

Do not silently omit unsupported code in a way that makes the graph appear
complete.

### Keep definition and invocation identity separate

One process definition can appear in multiple invocation contexts.

Graph nodes therefore need source-backed invocation identity, not just the
component name.

### Treat runtime graphs as a separate view

If a supported Nextflow command can generate an execution-oriented graph, offer
it as an explicitly requested feature.

Do not use runtime graph generation as the default parser. Inspect whether the
chosen command performs evaluation, downloads, or other side effects before
exposing it.

Runtime features are deferred to [phase 6](phase-6-execution.md).
