# Agent Guide

This file is the shared, model-agnostic source of truth for coding agents working in this repository. Read it first, then consult `agent-memory/*` before making large changes.

## Project Overview

- Saarthi V2 is a personal-growth coaching app organized around user-created **threads** — freeform, persistent conversation spaces (think iMessage threads or Linear discussions) rather than V1's predefined morning/evening/general session flows.
- The mobile client is an Expo / React Native app using Expo Router, TypeScript strict, and NativeWind v4.
- The backend is a Python 3.12 FastAPI service in `server/`, managed by `uv`. Today it only exposes `/health`; conversation orchestration, voice, and tools will land later.
- Supabase is the main persistence layer. V2 **shares the V1 project** (`pedalbyxrzkltfbzbewc`) and reuses `auth.users`, but all V2 tables are prefixed `v2_` to avoid colliding with V1's schema.
- Voice will be a first-class feature once added (recording, transcription, streaming, TTS), but the path is not yet implemented.

**Expo SDK 56 reminder:** APIs changed a lot in 56. Before writing Expo/RN code, check https://docs.expo.dev/versions/v56.0.0/.

## Architecture At A Glance

- `src/app/`: Expo Router screens and layouts. Keep screens thin; push logic into hooks or `lib/`.
- `src/components/`: Reusable UI. Shared primitives under `components/ui/`.
- `src/hooks/`: React hooks that connect UI state to `lib/` functions.
- `src/lib/`: Client-side business logic, Supabase helpers, prompt helpers, server API clients.
- `src/constants/`: Design tokens and app-wide constants. NativeWind classes are the primary styling path; `theme.ts` is for JS-side consumers (StatusBar, native nav themes).
- `src/types/`: Shared TypeScript types.
- `server/`: FastAPI backend (uv-managed). Today: `/health` only.
- `supabase/migrations/`: SQL schema changes. Treat as the record of database evolution. V2 tables are prefixed `v2_`.
- `agent-memory/`: Shared long-term memory for any coding agent.
- `skills/`: Shared skill source of truth — model-agnostic.

### Conventions

- TypeScript + Python repo, not a package monorepo.
- The app owns navigation and UI state; the server owns conversation orchestration, context assembly, and tool-backed behavior.
- NativeWind classes for styling — avoid `StyleSheet.create` unless there is a strong reason.
- Prefer incremental, well-scoped edits over sweeping rewrites.

## Development Workflow

### Install

- App dependencies: `npm install`
- Server env file: `cp server/.env.example server/.env`
- Server dependencies: `cd server && uv sync`

### Run

- Mobile dev server: `npm run start`
- iOS native run: `npm run ios`
- Local server: `bash server.sh` (or `cd server && uv run python main.py`)

### Test

- No test suites wired up yet. When adding the first ones, prefer Jest for TS/RN and pytest for the Python server.

### Database / Infra

- Review schema changes in `supabase/migrations/` before editing persistence logic.
- All V2 tables are prefixed `v2_` because the Supabase project is shared with V1.
- Treat `server/.env` and any secrets as local-only inputs; never commit secrets.

## Coding Style And Conventions

### TypeScript / React Native

- TypeScript is in strict mode. Do not introduce `any` unless there is a strong, documented reason.
- Prefer importing shared types from `src/types/`.
- Use functional components and hooks.
- Keep screens thin; move reusable logic into `src/hooks/` or `src/lib/`.
- Style with NativeWind classes (`className="..."`). Reach for `constants/theme.ts` tokens only when you need a colour value on the JS side (StatusBar, native nav themes).
- When inline styles are unavoidable, feed them from tokens, not raw magic numbers.
- Use clear user-visible error states around async UI actions.

### Python / Server

- Target Python 3.12.
- Keep route handlers thin; move orchestration into modules under `server/` as the surface grows.
- Prefer explicit typed models and structured return shapes.
- Missing data should usually degrade gracefully to empty values instead of raising unless failure is truly exceptional.

### General

- Match existing naming: `PascalCase` for components, `camelCase` for hooks and TS utilities.
- Prefer focused modules with one clear responsibility.
- Comments should explain non-obvious intent, invariants, or tradeoffs — not restate code.

## Agent Behavior

### When To Act Immediately

- Small, local, low-risk fixes can be made directly.
- Documentation, refactors without behavior changes, and scoped bug fixes usually do not need an approval pause.

### When To Plan First

Propose a short plan and wait before proceeding when a change would:

- Touch multiple layers at once (app + server + schema).
- Require schema migrations, data backfills, or contract changes.
- Affect authentication, production deployment, or release setup.
- Introduce a new dependency or replace an existing architecture pattern.

### How To Execute Large Edits

1. Read this file plus `agent-memory/*` and `PROGRESS.md`.
2. Inspect the current implementation before proposing abstractions.
3. Break the work into small patches that preserve behavior whenever possible.
4. Summarize behavioral impact and any remaining risk.

## Files To Treat As Reference

- `PROGRESS.md`: what's done, stubbed, and skipped in V2 so far.
- `supabase/migrations/`: source of truth for V2 schema history (`v2_` prefixed tables).
- `agent-memory/general.md`: cross-project coding preferences and working style.
- `agent-memory/tools.md`: integrations, APIs, and operational safety notes.
- `agent-memory/domain.md`: domain rules and invariants that must not break.
- `agent-memory/decisions.md`: important architecture and product decisions.

## Out Of Scope / Do Not Change Without Explicit Permission

- Production deployment, EAS release settings, or Apple capability settings.
- Secrets, credentials, `.env` files, or auth provider configuration.
- Bundle identifier (`com.saarthi.app`) — chosen deliberately to ship over V1 at cutover.
- License, repository metadata, or broad formatting churn unrelated to the task.
- V1 repo at `../V1` — read-only reference unless explicitly asked.
