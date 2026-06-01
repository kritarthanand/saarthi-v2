# V2 Progress

Greenfield rebuild of Saarthi. V1 lives at `../V1` and remains the canonical reference for any pattern V2 hasn't ported yet.

## Decisions Locked In (2026-05-31)

- **Supabase** — V2 shares V1's project (`pedalbyxrzkltfbzbewc`) and reuses `auth.users`. New V2 tables are prefixed `v2_` to coexist with V1's schema in the same `public` namespace.
- **Auth** — reuse V1's `auth.users`. No separate user table for V2.
- **Bundle id** — `com.saarthi.app` from day one. V2 will overwrite V1 on install. ⚠️ **Do not push V2 to TestFlight or the App Store until V2 is ready to fully replace V1.**

## Done

### App scaffold (Expo SDK 56 + TS strict + Expo Router)

- `npx create-expo-app@latest` with the default template, then stripped the demo screens / components.
- Source layout: `src/{app,components,hooks,lib,constants,types}`.
- Tabs scaffold at `src/app/(tabs)/{_layout,index,threads}.tsx`. Root layout at `src/app/_layout.tsx` (dark theme, gesture handler, light status bar).
- `app.json` updated: `name: Saarthi`, `slug: saarthi`, scheme `saarthi`, `bundleIdentifier: com.saarthi.app`, dark `userInterfaceStyle`, splash bg `#000`.

### NativeWind v4 + dark theme baseline

- `tailwind.config.js` with `nativewind/preset`, dark-first token palette (bg / fg / accent / border families).
- `babel.config.js` with `babel-preset-expo` (`jsxImportSource: nativewind`) + `nativewind/babel`.
- `metro.config.js` via `withNativeWind` reading `src/global.css`.
- `src/global.css` carries the three Tailwind directives.
- `src/global.d.ts` declares `*.css` modules and pulls NativeWind types.
- `src/constants/theme.ts` mirrors the Tailwind tokens for JS-side consumers (StatusBar, native nav themes).

### Supabase client

- `src/lib/supabase.ts` mirrors V1's pattern: `react-native-url-polyfill`, AsyncStorage-backed session storage, anon key from `EXPO_PUBLIC_SUPABASE_*` env.
- `.env.example` points at the shared V1 project URL with the V2 anon key slot.

### FastAPI server shell (`server/`)

- `pyproject.toml` (uv-managed) — Python ≥3.12, FastAPI, uvicorn[standard], python-dotenv, pytest + httpx in the dev group.
- `server/main.py` exposes `/health` and a `uvicorn.run` block.
- `server/.env.example` mirrors V1's env vars (OpenAI, Anthropic, Supabase, PORT, IS_TEST).
- `server.sh` at the repo root is a tiny local-only runner: checks `.env`, `cd server && uv run python main.py`.
- Verified: `uv sync` succeeds, `GET /health → 200 {"status":"ok","service":"saarthi-v2"}` via TestClient.

### Threads schema + placeholder screen

- `supabase/migrations/20260531_v2_threads.sql` drafts `v2_threads`, `v2_thread_messages` with RLS scoped to `auth.uid()`, a `set_updated_at` trigger, and a `last_message_at` bump trigger fired on message insert. **Not applied yet.**
- `src/types/threads.ts` mirrors the DB shape.
- `src/app/(tabs)/threads.tsx` lists `v2_threads` rows sorted by `pinned desc, last_message_at desc`, with loading / empty / error states.

### Claude tooling port

Copied as-is then pruned of V1-only references:
- `AGENT.md` — V2 model rewrite (threads, no FlowLoop / no voice path / no `conversations` yet, Expo 56 reminder).
- `CLAUDE.md` — V2 entrypoint, points at the new `AGENT.md`.
- `agent-memory/decisions.md` — added three V2 entries (Supabase namespacing, bundle id, threads-as-primary-UX) above a "V1 Carryover" marker.
- `agent-memory/domain.md` — fully rewritten for V2 entities.
- `agent-memory/tools.md` — fully rewritten for V2's smaller surface.
- `agent-memory/general.md` — kept V1 text, swapped `types/` → `src/types/`, `constants/theme.ts` → `src/constants/theme.ts`, dropped the FlowLoop-era server split note.

Skills copied as-is, annotated where they don't fully work in V2 yet:
- `skills/iterate/SKILL.md` — runs today (it's already generic).
- `skills/build-ios/SKILL.md` — annotated `V2 readiness: needs EAS configured`.
- `skills/is-app-broken/SKILL.md` — annotated `V2 readiness: needs scripts/bootstrap-worktree.sh and .maestro/`.

Stubbed (SKILL.md = TODO with V1-assumed / V2-needs notes):
- `skills/test-app-locally`
- `skills/conversation-debugger`
- `skills/supabase-query`
- `skills/pipeline-dashboard`
- `skills/{feature,from-spec,approve-spec,accept-feature,revert-feature}` (agentic pipeline commands)

Pipeline subagent placeholders in `.claude/agents/`:
- `pm.md`
- `implementer-default.md`
- `implementer-fast.md`
- `tester-quinn.md`
- `maestro-author.md`

## Skipped (V1 had it, V2 doesn't need it yet)

Listed so you can pull any of these forward when needed. None of these are stubbed — they don't exist in V2.

- **Skills** — `bisect-feature`, `codex-review`, `flowloop-validate`, `local-saarthi-dev`, `refactor`, `skill-sync`, `maestro-author` (skill, not the subagent above).
- **Pipeline agents** — `completeness-auditor`, `red-team-spec`, `red-team-tests`, `reviewer`, `reviewer-severity-anchors` (the rest of `.claude/agents/`).
- **Pipeline machinery** — `.claude/hooks/`, `.claude/rules/`, `.claude/schemas/`, `.claude/worktrees/`, `agent-memory/pipeline.md`, `meta/`, `plan.md`, `threads_impl.md`, `char_sys_found.md`.
- **Plugins** — `.claude/plugins/codex` (Codex integration).
- **Settings** — `.claude/settings.json`, `.claude/settings.local.json`.
- **Tests + lint scaffolding** — `__tests__/`, `__mocks__/`, `jest*.config.js`, `jest-setup.js`, `tsconfig.test.json`, `biome.jsonc`, `promptfoo/`, `mypy-baseline.json`, `test.sh`.
- **V1 domain code** — `app/`, `components/`, `hooks/`, `lib/`, `constants/`, `utils/`, `types/`, `prompts/`, `characters/`, `qa-reports/`, `docs/`, `web/`, `scripts/` (V1 root-level scripts), `dist/`.
- **V1 server modules** — `server/flows/`, `server/graph/`, `server/agents/`, `server/memory/`, `server/data/`, `server/providers/`, etc. V2's `server/` is just `main.py` + `pyproject.toml` + `.env.example`.
- **Supabase / infra** — `supabase/` (V1 migrations), `setup-server.sh`, `eas.json`, `plugins/` (config plugins), `__mocks__/`, `meta/`.
- **iOS native shell** — V1 had a `ios/` checked-in native project; V2 stays on Expo prebuild on demand.

## Surfaced Mismatches You Asked About

- **`maestro-flow`, `meal_guru`, `workout-guru`** — listed in the brief as "COPY SKILLS" but none exist in V1.
  - `maestro-flow` exists only as `.claude/commands/maestro-flow.md` in V1, not a `skills/` entry.
  - `meal_guru` and `workout-guru` have no trace in V1 (`skills/`, `.claude/`, or anywhere else).
  - Per your call: skipped for now, listed here so you can decide whether you meant different names.

## Env vars across worktrees

`scripts/bootstrap-worktree.sh` is the entry point for any fresh worktree.
- Canonical env files live at `${XDG_CONFIG_HOME:-~/.config}/saarthi-v2/{app,server}.env` — outside every worktree.
- First run seeds them from the repo's `.env.example` templates and exits non-zero asking you to fill in values.
- Each run symlinks them into the worktree as `.env` and `server/.env`.
- Re-runs are idempotent. The script refuses to clobber a real (non-symlink) env file — delete it or merge it into the canonical location first.

Rotating a key happens in one place.

## What's Next (suggested order)

1. **Apply the threads migration.** Review `supabase/migrations/20260531_v2_threads.sql`, then run it against the shared project. Confirm RLS by inserting + selecting as an authenticated user.
2. **Auth scaffold.** V2 has the Supabase client but no auth screen, no protected-route gate. Decide between OAuth, email magic link, or anonymous-with-upgrade — V1 uses one of these and the choice should match.
3. **Thread create + open flow.** Today threads.tsx is read-only. Wire a "new thread" affordance and a `/threads/[id]` detail screen reading `v2_thread_messages`.
4. **Server thread route.** Add `POST /threads/{id}/messages` (SSE streaming) on the FastAPI side. V1's voice SSE contract (`transcript / stage / token / tts_start / audio_chunk / done`) is the reference shape, but the event vocabulary can be simpler at first — start with `token` + `done`.
5. **Tests scaffold.** Pick the first Jest test (probably the threads list) and the first pytest test (`GET /health`) and wire CI later.
6. **Voice path port.** V1's `useVoiceLoop.ts` + server `/voice-stream` is the proven baseline. Schedule it after the text path works end-to-end.
