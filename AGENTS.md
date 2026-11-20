# Agent handoff requirements

- **Mandatory final-response gate:** every final response to the user MUST end
  with a section headed exactly `## Work summary`. A response without this
  section is an incomplete handoff; do not send it.
- Before sending, verify that this section directly states:
  - **Status:** complete, in progress, or blocked.
  - **Work:** what changed (including file paths for implementation work), or
    what was concluded for informational work.
  - **Validation:** checks run and their actual results, including failures,
    skips, and unavailable checks.
  - **Blockers/next action:** remaining blockers and the next action or decision
    needed; explicitly say when none remain.
- Keep the summary concise but specific enough that the user can understand the
  outcome without reconstructing it from earlier messages. Never imply that
  checks passed when they did not or describe a prototype as production-ready.
- Put the summary in the chat response. Do not create a separate summary,
  handoff, or status file unless the user explicitly asks for that artifact.
- Apply this gate to implementation, research, planning, and clarification
  responses alike. For a response that makes no repository changes, state that
  no files were changed and give the answer or requested next step.
- **Pre-send checklist:** confirm the exact heading is present, all applicable
  facts above are included, and the summary is the final section of the response.
- Accept open-source dependency licenses, including copyleft licenses, and
  comply with their attribution, notice, and source-availability terms. Adjust
  this project's license where needed to meet those terms; do not ask for
  approval for an open license. Notify the user only when a dependency is
  confirmed to require a closed or proprietary license.
