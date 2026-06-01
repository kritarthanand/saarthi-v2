# Decisions Memory

Purpose: a lightweight ADR-style log for notable product and architecture decisions. Any agent can read this to understand why the repo is shaped the way it is, and append new entries when a meaningful decision is made.

How to use it:
- Keep entries short and factual.
- Mark inferred entries clearly until a human confirms them.
- Prefer recording decisions with impact on architecture, contracts, or working style.

> **V2 note:** entries below the "V1 carryover" marker were inherited from V1
> and may not all apply to V2 yet. Treat them as historical context until V2
> stands up its own equivalent surfaces (FlowLoop, voice path, pipeline). V2-specific
> decisions live above the marker.

## V2 Entries

### Confirmed: V2 shares the V1 Supabase project, namespaces with `v2_`

- Status: confirmed (2026-05-31)
- Decision: V2 connects to the same Supabase project as V1 (`pedalbyxrzkltfbzbewc`) and reuses `auth.users`. All new V2 tables are prefixed `v2_` (e.g. `v2_threads`, `v2_thread_messages`) so V1's schema is untouched.
- Why: lets users keep one login across V1 and V2 during the transition; avoids rebuilding OAuth providers and migrating user rows; keeps V2 schema disposable at cutover (drop `v2_*` tables).
- Implication: never name a V2 table without the `v2_` prefix. Cross-table foreign keys to V1 tables (e.g. `auth.users`) are fine; cross-table FKs to V1 *app* tables should be avoided unless explicitly intended.

### Confirmed: V2 ships under `com.saarthi.app` from day one

- Status: confirmed (2026-05-31)
- Decision: V2's iOS bundle identifier is `com.saarthi.app` — the same as V1. V2 overwrites V1 on install.
- Why: no rename step at cutover; no TestFlight migration; users get V2 as a regular App Store update.
- Implication: do NOT push V2 to TestFlight or the App Store until V2 is ready to fully replace V1. Local dev (simulator, development builds) is safe and will overwrite V1 on the same device.

### Inferred: Threads are the V2 primary UX, not session-type tabs

- Status: confirmed by product direction (2026-05-31)
- Decision: V2 replaces V1's morning/evening/general/vent session tabs with a **threads UI** — user-created, freeform, persistent conversation spaces, like iMessage threads or Linear discussions.
- Why: V1's predefined daily flows forced users into a ritual structure that didn't map to how coaching conversations actually evolved; threads let topics persist and surface organically.
- Implication: V1 patterns tied to a specific session type (flow YAML keyed on `session_type`, daily-scoped `conversations` rows, the `(morning|evening|general)` enum) do NOT transplant directly. Design V2 server APIs around `thread_id`, not `session_type` / date.

## V1 Carryover

### Inferred: Expo Router + React Native for the client

- Status: inferred from current codebase
- Decision: the mobile app uses Expo with Expo Router rather than a custom native navigation stack.
- Why it appears chosen: the repo is organized around file-based routing in `app/`, Expo scripts in `package.json`, and Expo-specific dependencies throughout the client.
- Implication: screen changes should respect file-based routing and existing Expo workflows.

### Inferred: FastAPI server as a thin but intelligent proxy

- Status: inferred from current codebase
- Decision: model access, flow staging, tool use, transcription, and TTS are routed through the Python server instead of being handled directly in the client.
- Why it appears chosen: the app calls server endpoints for chat, voice, extraction, transcription, and speech, while the server owns auth verification and context assembly.
- Implication: API contract changes need coordinated updates across client callers, server handlers, and docs.

### Confirmed: Naming — FlowLoop vs LangGraph

- Status: confirmed (2026-05-03)
- Decision: our orchestration system in `server/graph/` is called **FlowLoop**. It is a hand-rolled async tool-loop, NOT the third-party `langgraph` package.
- Do not `pip install langgraph` and do not `from langgraph import ...`.
- The only LangChain-family dependency we use is `langchain-openai` for its `ChatOpenAI` wrapper in `server/providers/openai_provider.py`.
- Implication: whenever you see "FlowLoop" in this repo, it refers to `server/graph/builder.py:stream_graph()` — a bespoke async loop that handles stage resolution, context assembly, tool dispatch, and provider fallback.

### Confirmed: FlowLoop is not LangGraph

- Status: confirmed (2026-05-03)
- Decision: our orchestration in `server/graph/` is **FlowLoop** — a hand-rolled async tool-loop. Do NOT `pip install langgraph` and do NOT `from langgraph import …`.
- The only LangChain-family dependency is `langchain-openai` for `ChatOpenAI` in `server/providers/openai_provider.py`.
- Implication: whenever you see "FlowLoop" in this repo, it refers to `server/graph/builder.py:stream_graph()`. Adding `langgraph` would introduce a silent conflict with our bespoke loop.

### Confirmed: TDD on FlowLoop and FastAPI changes

- Status: confirmed (2026-05-03)
- Decision: every server-side workstream begins with a failing pytest before touching implementation code.
- Why: catches interface regressions before they compound across the async tool-loop stages.
- Implication: do not write server implementation first; write the test, watch it fail, then fix.

### Aspirational: Validators on every FastAPI route

- Status: aspirational — not yet fully enforced in current server
- Decision: new FastAPI routes must use pydantic models for request and response. Auth-protected routes must call `verify_token` from `server/auth.py`. Existing routes that return bare `dict`/`Response` values do not yet comply; they should be brought into compliance incrementally as they are touched.
- Why: we have no API gateway; pydantic + auth middleware are the intended contract boundary.
- Implication: when adding a new route, always declare a response model. When modifying an existing route that lacks one, add it in the same pass. Do not assume existing routes have response models without checking.

### Confirmed: Voice path contract is a breaking surface

- Status: confirmed (2026-05-03)
- Decision: `/voice-stream` is a breaking surface. The client (`hooks/useVoiceLoop.ts`) parses the following SSE event types: `transcript`, `session_type`, `stage`, `token`, `tts_start`, `audio_chunk`, `done`. Renaming or removing any of these is a breaking change and requires a `/plan` migration reviewed before implementation.
- Why: `hooks/useVoiceLoop.ts` is the sole consumer of the voice SSE stream; each event type branches into specific client state transitions. A silent rename breaks live voice sessions with no compile-time signal.
- Implication: never rename or remove a consumed SSE event type without a coordinated client+server migration. Adding new event types is safe if the client ignores unknown types.

### Confirmed: /iterate vs /feature — keep both, separate concerns

- Status: confirmed (2026-05-03)
- Decision: `/iterate` and `/feature` serve different purposes and must coexist. `implementer-default.md` is a **new, distinct agent** — not a mode of the iterate runtime.
- Analysis: `skills/iterate/SKILL.md` is a single-task, ad-hoc execution loop: read `PROGRESS.md` + `TASKS.md`, implement one pending task, open a PR, update the tracker, push. No decomposition, no kanban, no worktrees, no DAG fan-out. This is fundamentally different from the agentic pipeline.
- Boundary:
  - `/iterate` — lightweight one-shot: pick next task from tracker, implement, PR, done. No orchestration layer.
  - `/feature` — multi-workstream orchestrated pipeline: PM decomposes, implementers fan out in worktrees with Tier A hooks, Codex reviews, Quinn validates. Full kanban lifecycle.
  - `implementer-default.md` is a new subagent used exclusively within the `/feature` pipeline, not a variant of iterate.
- Why keep separate: merging them would force iterate's simple tracker workflow to carry pipeline machinery it doesn't need, and would make the pipeline's implementer agent depend on PROGRESS.md conventions that only make sense in one-shot mode.
- Implication: do not refactor `/iterate` to use pipeline hooks or ledger. Do not make `implementer-default.md` read `PROGRESS.md`. If a task is too small for `/feature`, use `/iterate`.

### Inferred: Declarative flow behavior over hardcoded conversation logic

- Status: inferred from current codebase
- Decision: conversation structure is expressed with YAML flow configs plus extraction schemas instead of burying all behavior inside app screens.
- Why it appears chosen: `server/flows/configs/*.yaml`, registry loading, and extraction models all point to configuration-driven session behavior.
- Implication: new session behavior should usually start with flow config and schema changes before bespoke control flow in UI code.
