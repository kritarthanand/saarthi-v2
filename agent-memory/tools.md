# Tools Memory

Purpose: shared notes about the major tools, integrations, services, and operational surfaces used in this repo. Any agent should read the relevant section before changing integration code.

How to use it:
- Consult the matching subsection before editing integration code.
- Prefer safe, reversible changes and preserve existing contracts unless intentionally updating them.
- Add short operational notes when a tool proves tricky, brittle, or easy to misuse.

## Expo / React Native

- The app runs through Expo SDK 56+ and Expo Router.
- Primary commands: `npm run start`, `npm run ios`, `npm run android`, `npm run web`.
- Mobile routing is file-based under `src/app/`.
- Styling uses NativeWind v4 (`tailwind.config.js`, `src/global.css`, `babel.config.js`, `metro.config.js`). Use `className="..."` on components.
- Expo 56 introduced API changes — when in doubt, check https://docs.expo.dev/versions/v56.0.0/ before writing code.

## Jest

- Not wired up yet. When the first tests land, default to Jest for TS/RN.

## Supabase

- V2 shares the V1 project (`pedalbyxrzkltfbzbewc`) and reuses `auth.users`.
- V2 schema history lives in `supabase/migrations/`. All V2 tables are prefixed `v2_` so V1 tables stay untouched.
- Client-side DB access goes through `src/lib/supabase.ts`. Service-key access lives on the server, never in the client.
- Migrations are drafted in this repo but applied manually for now — review every migration before pushing.

## FastAPI Server

- Lives in `server/`. Python 3.12, FastAPI, dependencies managed by `uv`.
- Start with `bash server.sh` (or `cd server && uv run python main.py`).
- Today only `/health` is implemented. Conversation orchestration, voice path, and tool layer will be added later.
- Server tests will run with pytest once they exist (`cd server && uv run pytest`).

## OpenAI / Anthropic Proxies

- The mobile app should not call model providers directly — it talks to the Saarthi FastAPI server.
- Env vars for provider keys live in `server/.env` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Never commit `.env`.

## Cloudflare / Production Scripts

- Not present in V2 yet. V1 had `server.sh` and `setup-server.sh` plus Cloudflare tunnel handling; V2's `server.sh` is intentionally a tiny local-only runner.
- Do not add deployment or tunnel setup without explicit approval.
