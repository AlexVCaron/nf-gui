# Phase 7 — Broader editing and upstream contributions

[Main plan](../../PLAN.md) · [Previous: optional execution](phase-6-execution.md)

**Required reporting:** update [task status and evidence](../../PLAN_TRACKING.md#phase-7--expansion-and-upstream-contributions)
and [CHANGELOG.md](../../CHANGELOG.md) for work on this phase, including partial
progress and blockers; follow the [reporting workflow](../../PLAN.md#required-progress-reporting).

## Objective

Broaden editing support and upstream shared features.

Expand only after the semantic and source-editing foundations are proven.

## Direction

Keep the [semantic integration preference order](phase-2-structural-extraction.md#choosing-the-semantic-integration-strategy):

1. Supported official language-server interfaces.
2. A thin adapter around the official parser/compiler frontend where needed.
3. Upstream structural/editing capabilities that are useful to other clients.
4. A small, isolated language-server fork only as a last resort.

Upstream contributions may proceed alongside the earlier adapter work where a
missing capability is broadly useful; they need not wait for this phase.
Acceptance and release schedules are external, and application-specific
features may not belong upstream.

Continue to reject an independent Nextflow parser or canonical pipeline model.
Broader support must preserve the same source authority, conservative editing,
compatibility, and round-trip validation requirements.

The [deferred features](phase-4-usable-application.md#defer) are not an automatic
commitment for this phase. They should not distract from proving that visual
editing remains faithful to Nextflow.
