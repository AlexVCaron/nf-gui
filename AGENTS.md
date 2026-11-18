# Agent handoff requirements

- Every final chat response must include a concise **Work summary** section. Do
  not leave the user to infer what changed or what to do next.
- For implementation work, state the files or behavior changed, validation
  results (including failed, skipped, or unavailable checks), remaining
  blockers, and the next action or any decision needed from the user.
- For research or informational work, summarize the answer and any caveats or
  follow-up needed.
- Put the summary in the chat response. Do not create a separate summary,
  handoff, or status file unless the user explicitly asks for that artifact.
- Be clear about whether work is complete, in progress, or blocked. Never
  describe a prototype as production-ready or imply checks passed when they did
  not.
