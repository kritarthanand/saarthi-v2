# Claude Code Entrypoint

You are Claude Code working on the Saarthi **V2** repository.

Read `AGENT.md` for the canonical instruction set.

Quick reference:
- Stack: Expo SDK 56+ (Router, TS strict, NativeWind v4) + FastAPI (uv) + Supabase (shared project `pedalbyxrzkltfbzbewc` with V1)
- Package manager: npm (NOT pnpm)
- Quota: Max OAuth + Pro OAuth, NO API keys for dev work
- Expo 56 changed a lot — when touching Expo/RN APIs, check https://docs.expo.dev/versions/v56.0.0/ before writing code.

## V2 vs V1

V2 is a greenfield rebuild of Saarthi. The headline UX change: a **threads UI** (user-created, freeform, persistent conversation spaces — iMessage-style) instead of V1's morning/evening/general session tabs.

V1 lives at `../V1` and is the source of truth for any pattern V2 hasn't ported yet. V2 reuses the V1 Supabase project but namespaces new tables with `v2_` so V1 stays untouched.

## Source Of Truth

Always read `AGENT.md` in the repo root first and follow it as the canonical shared instruction set for this codebase.

Use `agent-memory/` for shared long-term memory:

- `agent-memory/general.md`
- `agent-memory/tools.md`
- `agent-memory/domain.md`
- `agent-memory/decisions.md`

## Claude-Specific Extras

- `.claude/agents/` — pipeline subagent definitions (currently stubbed; see `skills/<name>/SKILL.md` for the corresponding skill stubs).
- `.claude/commands/` — slash-command wrappers (also stubbed for pipeline commands).

## What's NOT Here Yet

V2 is early scaffolding. None of the following exist yet — don't assume V1 patterns are wired up:

- No FlowLoop / flow YAML configs (`server/flows/`, `server/graph/`).
- No voice path (`/voice-stream`, audio helpers).
- No conversation domain (`conversations`, `daily_scores`, todos, habits).
- No tests, no CI.
- Folder-scoped CLAUDE.md files (`app/CLAUDE.md` etc.) — will appear as those layers grow.

See `PROGRESS.md` for what's done, stubbed, and skipped.
