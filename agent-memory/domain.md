# Domain Memory

Purpose: shared knowledge about the product domain, core entities, and invariants that should survive refactors. Any agent should read this before changing user-facing behavior or persistence logic.

How to use it:
- Treat the items here as domain constraints unless the user explicitly decides to change them.
- Update this file when a product rule becomes stable enough to matter across tasks.
- If a rule is inferred rather than confirmed, mark it clearly.

## Product Model

- Saarthi V2 is a coaching app centered on **threads** — user-created, freeform, persistent conversation spaces.
- Voice will become a first-class interaction (recording, transcription, streaming responses, TTS), but is not yet implemented in V2.
- Quantified-self feedback (scores, habits, todos) exists in V1's domain and will likely return to V2, but is **not** part of the V2 surface today.

## Key Entities (V2)

- `v2_threads`: one persisted thread per user. Has a title, optional icon and summary, pinned/archived flags, and a `last_message_at` used to sort the list.
- `v2_thread_messages`: ordered user / assistant / system / tool messages within a thread. JSON `meta` carries tool name, audio refs, model used, etc.
- `auth.users`: shared with V1 — do not redefine.

## Behavioral Invariants

- User-scoped data must stay scoped to the authenticated user (RLS policies enforce this; never bypass with the service key from the client).
- Missing context should usually degrade gracefully rather than breaking the whole experience.
- Shared types and stored shapes should stay aligned across client code, server code, and migrations.
- V2 tables are prefixed `v2_`. V1 tables are off-limits to V2 code without an explicit decision.

## What's Different From V1

- V1's `morning` / `evening` / `general` session types do not exist in V2. There is no per-day session record; the unit of conversation is a thread.
- V1's `threads` / `thread_messages` tables (sadhana-card model with templates and lifecycle states) are unrelated to V2's `v2_threads` / `v2_thread_messages` despite the similar names.
- V1's scoring, habit, todo, ritual, and memory entities are not present in V2 yet. Don't assume they exist when writing queries.

## Watchouts

- The shared Supabase project means a careless query without the `v2_` prefix may hit V1 tables.
- A schema change can ripple through Supabase queries, TypeScript types, server data sources, and tests.
- Time- and date-based logic on threads should sort by `last_message_at`, not `created_at`, so active threads bubble up.
