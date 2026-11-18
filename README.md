# nf-gui

## Prototype

A runnable, explicitly limited Tauri prototype is in [`poc/`](poc/README.md).
It exercises the frontend/editor/canvas shell and establishes JavaScript and
Rust lockfiles plus reusable artifact-integrity and dependency-audit checks.
It is not a functional workflow editor; its remaining security and dependency
blockers are recorded in the [P0-07 findings](docs/plan/phase-0-audit-findings.md#p0-07-candidate-dependency-and-supply-chain-snapshot).

## Development plan

Contributors and agents: start with [PLAN.md](PLAN.md) for the Nextflow-native
GUI architecture, constraints, and links to all eight implementation phases.
The phase files preserve the detailed initial plan, including dependency
rationale and research questions that still require upstream verification.

Report task advancement in both [PLAN_TRACKING.md](PLAN_TRACKING.md) and
[CHANGELOG.md](CHANGELOG.md), following the
[required reporting workflow](PLAN.md#required-progress-reporting).
Agents must include a concise handoff summary in chat and follow
[`AGENTS.md`](AGENTS.md); do not create a separate summary file unless asked.
