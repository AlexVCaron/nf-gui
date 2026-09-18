# Phase 6 — Optional execution features

[Main plan](../../PLAN.md) · [Previous: compatibility and packaging](phase-5-compatibility-packaging.md) · [Next: expansion and upstream contributions](phase-7-expansion.md)

**Required reporting:** update [task status and evidence](../../PLAN_TRACKING.md#phase-6--optional-execution)
and [CHANGELOG.md](../../CHANGELOG.md) for work on this phase, including partial
progress and blockers; follow the [reporting workflow](../../PLAN.md#required-progress-reporting).

## Objective and work

Add optional execution features:

- Explicit run configuration.
- Parameter-file handling.
- Runtime logs and cancellation.
- Execution-oriented graph/report views where supported.
- Environment/container integration.

**Exit criterion:** execution remains a separate, permissioned capability and
does not become necessary for ordinary editing.

## Boundaries

The Nextflow runtime is optional for editing and required for execution
features. Docker/Podman and Conda are possible project execution dependencies,
not prerequisites for the GUI itself.

Keep execution-oriented graphs separate from the static source-backed graph.
Only expose a supported graph command after auditing whether it performs
evaluation, downloads, or other side effects; do not use it as the default
parser.

Only claim effective configuration values when official tooling has resolved
them for the explicitly selected invocation context. Keep declared values,
schema defaults, user choices, and runtime-resolved values distinct.

Apply the [workspace trust and execution boundaries](phase-5-compatibility-packaging.md#security-and-execution-boundaries)
to every execution-dependent action, including validation that requires
evaluation. Opening a folder must not implicitly authorize a pipeline run.

Remote execution infrastructure and cloud credentials management remain
outside the initial release scope.
