# Phase 3 — Source-preserving visual edits

[Main plan](../../PLAN.md) · [Previous: structural extraction](phase-2-structural-extraction.md) · [Next: first usable application](phase-4-usable-application.md)

## Objective and work

Prove source-preserving visual edits:

- Implement a small set of operations.
- Establish document-version checks.
- Coordinate multi-file edits and undo.
- Reanalyze after changes.

**Exit criterion:** round-trip tests demonstrate that visual edits are correct
and preserve unrelated source.

## Visual editing without owning the language

The interaction model should be:

> User intent → official semantic resolution → minimal source edit → official
> reanalysis → refreshed view

Not:

> User changes graph JSON → application regenerates the pipeline

### Transaction requirements

Every visual edit should:

1. Identify the source entities involved.
2. Record the exact document versions used for analysis.
3. Verify that the operation is supported for those constructs.
4. Produce narrowly scoped source edits.
5. Apply them as one coordinated transaction.
6. Update language-server document state.
7. Reanalyze affected files.
8. Confirm or report the resulting diagnostics.
9. Support undo as a coherent user action.

Reject stale operations rather than applying edits to changed source ranges.

### Source preservation

Preserve:

- Comments.
- Unrelated formatting.
- Existing expressions.
- Import aliases.
- User-written configuration.
- Unsupported language regions.

Use existing official edit APIs where available. Otherwise, combine official
parse structure with conservative source-range edits.

Do not assume AST pretty-printing can preserve comments and formatting. Verify
source fidelity before considering it.

### Initial supported operations

Start with a deliberately bounded set:

- Change a literal parameter value.
- Bind an existing value or expression to a known invocation input.
- Rebind an existing input to a resolvable output.
- Rename through official rename support.
- Insert a supported invocation into a simple workflow.
- Add a resolvable include/import.
- Remove a supported invocation with reference checks.

Adding or changing a component’s formal inputs is a **definition/signature
edit**, potentially affecting many callers. Treat it as a separate,
workspace-wide operation, not a local property change.

### Unsupported operations

For dynamic or ambiguous constructs:

- Explain why visual editing is unavailable.
- Navigate to the relevant source.
- Keep text editing fully functional.
- Resume visual editing when analysis supports it again.

“View-only” is preferable to a plausible but incorrect rewrite.

## Associating fields, values, and components

### A. Formal inputs to invocation arguments

Use official resolution and signature information to associate:

- The invocation.
- The resolved component.
- Its formal inputs.
- Actual argument expressions.
- Known output references inside those expressions.

Do not infer argument binding from labels shown in the graph.

### B. Outputs to consumers

Build edges from resolved references where available.

An edge should express the relationship the source actually contains. It should
not imply that asynchronous channels behave like ordinary synchronous function
returns.

### C. Parameter forms

Use project schemas when available.

The interface can support:

- Descriptions and help.
- Required fields.
- Enumerations.
- Numeric constraints.
- File and directory selection.
- Basic schema validation.

However:

- The schema dialect must be supported explicitly.
- Nextflow-specific extensions require separate treatment.
- Browser-side validation should not be presented as equivalent to official
  runtime/schema-plugin validation.
- Defaults must not automatically overwrite source or user selections.

### D. Expression-valued inputs

Provide separate modes for:

- Literal value.
- Parameter reference.
- Component-output reference.
- Arbitrary source expression.

Do not evaluate arbitrary expressions simply to populate a form.

### E. Configuration precedence

Display declared values and their origins separately from effective values.

Only claim an effective value when official tooling has resolved it for the
explicitly selected invocation context.

## Validation

Apply the corpus and round-trip requirements in
[phase 5](phase-5-compatibility-packaging.md#validation-strategy) during this
phase, including stale-version rejection, multi-file atomicity, undo/redo,
unsaved buffers, and failure recovery.
