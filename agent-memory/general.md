# General Memory

Purpose: shared long-term notes about coding preferences, repo habits, and recurring expectations. Any agent can read this before making changes and append to it when a stable preference becomes clear.

How to use it:
- Read this before medium or large edits.
- Treat it as durable guidance, not a scratchpad.
- Add concise updates when a user preference repeats often enough to be worth remembering.

## Current Shared Preferences

- Prefer practical, iterative changes over ambitious rewrites.
- Keep instructions and docs small, explicit, and easy to evolve.
- Preserve existing workflows where possible instead of replacing them wholesale.
- Match local patterns before inventing new abstractions.
- Keep project guidance close to the code: root-level shared rules, folder-level notes, and reusable skills.

## Repo-Specific Style Signals

- The app uses TypeScript strict mode.
- The UI stack is React Native with Expo Router and NativeWind v4. Prefer `className="..."` over `StyleSheet.create`.
- Shared types are centralized under `src/types/`; reuse them instead of duplicating interfaces.
- Use NativeWind classes first; `src/constants/theme.ts` is for JS-side consumers that can't take a className.
- No test suites are wired up yet. When the first ones land, expect Jest for TS/RN and pytest for the server.

## Naming And Structure

- Components generally use `PascalCase` filenames.
- Hooks and utility modules generally use `camelCase` filenames.
- Screen files in `app/` should stay thin and delegate logic into hooks or lib modules.
- Server is currently a single `main.py` shell; resist premature `flows/` / `graph/` / `agents/` splits until there's enough surface area to justify them.

## Documentation Habits

- Update docs when a behavior or contract changes materially.
- Prefer short, directly actionable instructions over long narrative docs.
- Keep shared guidance in `AGENT.md` and long-lived facts in `agent-memory/*`.

## Placeholders To Fill In Later

- Preferred level of test coverage for UI-only polish changes.
- Preferences around migration naming and rollout sequencing.
- Preferred commit / PR style, if any.
