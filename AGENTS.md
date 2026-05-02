# DriftAI Agent Instructions

Before analyzing or editing this project, read `PROJECT_BRAIN.md` first.

Use `PROJECT_BRAIN.md` as the primary project reference so you do not rescan the whole repo every chat. Only inspect additional files that are directly relevant to the current task, or when the brain file appears stale or incomplete.

Stay strictly within the user's requested scope. If the user asks for one specific text/file/change, do only that specific change. Do not enhance adjacent features, refactor related code, fix unrelated issues, or modify extra files unless the user explicitly asks.

If you notice related improvements, risks, or cleanup opportunities, mention them as optional suggestions in the final response instead of implementing them on your own.

After every successfully completed task, ask the user whether `PROJECT_BRAIN.md` should be updated with any new architecture, behavior, setup, or known-issue changes discovered during the task.

Do not expose or commit secrets. Treat `secrets.ts` as local-only sensitive config.
