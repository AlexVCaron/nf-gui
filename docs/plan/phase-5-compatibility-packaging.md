# Phase 5 — Compatibility, security, validation, and packaging

[Main plan](../../PLAN.md) · [Previous: first usable application](phase-4-usable-application.md) · [Next: optional execution](phase-6-execution.md)

**Required reporting:** update [task status and evidence](../../PLAN_TRACKING.md#phase-5--compatibility-security-validation-and-packaging)
and [CHANGELOG.md](../../CHANGELOG.md) for work on this phase, including partial
progress and blockers; follow the [reporting workflow](../../PLAN.md#required-progress-reporting).

## Objective and work

Add compatibility and packaging:

- JVM/toolchain provisioning.
- Supported-platform builds.
- Signed releases.
- Offline behavior.
- Compatibility warnings.
- Crash recovery.
- Supply-chain inventory.

**Exit criterion:** a clean machine can install and use the application without
undocumented development prerequisites.

The security and validation requirements below apply from the first integration
spike onward; their placement here does not defer them until release.

## Security and execution boundaries

Nextflow workspaces can contain executable behavior. Opening a folder must not
implicitly authorize running its pipeline.

### Workspace trust

Define separate permission levels:

1. Read project files.
2. Start language analysis.
3. Allow dependency/plugin downloads.
4. Run validation requiring evaluation.
5. Execute pipelines or external tools.

Audit whether the selected language-server/parser initialization itself can
load project-controlled extensions or execute code.

### Tauri boundary

Prefer narrow Rust commands over broad frontend access.

Examples of allowed capabilities should be task-specific:

- Read an authorized workspace file.
- Apply a validated edit transaction.
- Send a language-server request.
- Open a native file picker.
- Start an explicitly approved execution.

Avoid exposing unrestricted shell execution or arbitrary filesystem access to
JavaScript.

### Process handling

- Pass executable arguments directly, not through a shell.
- Validate working directories.
- Control inherited environment variables.
- Separate protocol stdout from diagnostic stderr.
- Enforce message-size and resource limits.
- Kill managed child processes on shutdown.
- Handle process trees correctly on each platform.
- Treat crashes as recoverable service failures.

### Content handling

Treat hover documentation, schemas, diagnostics, and generated output as
untrusted content.

Disable raw HTML where possible, sanitize where necessary, and restrict external
links.

### Downloads and updates

- Pin official tooling artifacts.
- Verify provenance and integrity.
- Make downloads visible and permissioned.
- Support offline operation after installation.
- Sign distributed application artifacts and updates.
- Avoid automatically downloading a different Nextflow version merely because
  a project requests one.

### Secrets

Redact logs and support bundles.

Do not automatically persist credentials, full environment variables, or
sensitive parameter values.

## Validation strategy

### A. Build a representative source corpus

Include:

- Minimal DSL2 pipelines.
- Multi-file workflows.
- Imported and aliased modules.
- Repeated invocations.
- Named outputs.
- Tuple inputs and outputs.
- Channel operators.
- Branching and nested workflows.
- Parameter schemas.
- Multiple configurations and profiles.
- Incomplete source during editing.
- Unsupported or dynamic constructs.
- Projects outside nf-core conventions.

Use appropriately licensed fixtures.

### B. Verify language intelligence against official tooling

For each supported toolchain combination, compare:

- Diagnostics.
- Definition resolution.
- Input/output signatures.
- Module references.
- Rename behavior.
- Structural extraction.

Do not compare against an independently invented semantic oracle.

### C. Test edit round trips

For every supported visual operation:

- Confirm minimal source changes.
- Preserve comments and unrelated formatting.
- Reparse through official tooling.
- Verify expected semantic relationships.
- Check undo/redo.
- Check unsaved documents.
- Check stale-version rejection.
- Check multi-file atomicity.
- Check failure recovery.

### D. Test operational failures

Cover:

- Language-server crashes.
- Invalid protocol messages.
- JVM startup failure.
- Missing or incompatible Java.
- Unsupported Nextflow syntax/version.
- Interrupted downloads.
- Files removed during analysis.
- External edits to dirty buffers.
- Large or cyclic workspace structures.
- Paths containing spaces and Unicode.
- Platform-specific path and process behavior.

### E. Test security boundaries

Verify that:

- Opening a project does not run its pipeline.
- Untrusted content cannot invoke arbitrary native commands.
- File operations remain within authorized scope.
- Symbolic links cannot bypass the intended permission policy.
- Hover/schema content cannot inject active HTML.
- Logs do not leak sensitive values.
- Dependency downloads are controlled.
- Execution always requires explicit user intent.

## Main risks and decision gates

| Risk | Response |
|---|---|
| Language server lacks structural APIs | Thin adapter using official frontend; propose broadly useful extensions upstream |
| Compiler APIs are unstable | Isolate adapter, pin compatibility combinations, maintain contract tests |
| Visual edits damage source | Minimal range edits, conservative supported subset, round-trip tests |
| Dynamic semantics cannot be resolved | Explicit uncertainty and source-editing fallback |
| Project opening has side effects | Audit initialization and enforce workspace trust |
| Server and adapter disagree | Analyze identical document snapshots with an explicit compatibility matrix |
| Graph identities shift after edits | Use versioned source-backed identities and treat layout reconciliation as cosmetic |
| JVM packaging becomes fragile | Explicit provisioning strategy and clean-machine installation tests |
| Editor integration becomes too heavy | Compare a minimal Monaco bridge with CodeMirror before committing |
| Users mistake static validation for runtime correctness | Separate syntax, semantics, schema, configuration, and execution checks |

Dependency, Java distribution, packaging-tool, and test-tool decisions are
preserved in [phase 0](phase-0-upstream-audit.md#dependency-inventory-and-rationale).
