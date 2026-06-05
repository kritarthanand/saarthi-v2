# Spec — Workstream A: Threads Data Layer

> **Read first:** [`docs/threads-design.md`](../threads-design.md) — the master design doc. This spec is one of three parallel workstreams (A/B/C) carved from it. Don't re-derive design decisions here; this spec assumes you've read it.

## What this workstream owns

The entire data path for the recurring-conversation threads model: Supabase schema, FastAPI endpoints, React data hooks, and a seed script. When this lands, workstreams B and C can swap their fixture imports for live data with a one-line change.

**In scope:**
- Supabase migration (extend the existing one — see Step 0 below)
- FastAPI Pydantic models + endpoints
- TS data hooks (`useThreads`, `useThread`, `useEntry`)
- Seed script for the dev user

**Out of scope (other workstreams):**
- Per-template Summary view components → Workstream B (see [`specs/007-threads-b-summary-uis/spec.md`](../007-threads-b-summary-uis/spec.md))
- Chat tab + Coach pane integration → Workstream C (see [`specs/008-threads-c-chat-and-coach/spec.md`](../008-threads-c-chat-and-coach/spec.md))
- Any change to existing mock data flow (`src/lib/mockData.ts`) — leave it alone; B and C migrate off it on their own timelines

## Step 0 — Shared contract (do this first)

This module is the integration boundary between A, B, and C. If it already exists when you start, **read it and conform**. If not, create it exactly as specified — B and C will be importing it.

**File:** `src/lib/threads.ts`

```ts
export enum ThreadTemplate {
  MorningRitual = 'morning_ritual',
  EveningRitual = 'evening_ritual',
  WeeklyRitual  = 'weekly_ritual',
}

export type CoachId = 'nakula' | 'bheem' | 'arjun' | 'yudi' | 'sahdev';

export type Thread = {
  id: string;
  template: ThreadTemplate;
  coach_id: CoachId;
  tag: string;                    // '#MorningRitual'
  title: string;                  // 'Morning Ritual'
  activeEntryId: string | null;
  lastEntryAt: string | null;     // ISO timestamp
};

export type Entry = {
  id: string;
  thread_id: string;
  status: 'active' | 'closed';
  label: string | null;           // 'Wed Jun 4', 'Jun 1–7'
  meta: Record<string, unknown>;
  created_at: string;             // ISO
  closed_at: string | null;
};

export type EntryItem = {
  id: string;
  entry_id: string;
  section: string | null;         // weekly: 'review' | 'plan'; else null
  label: string;
  done: boolean;
  points: number;
  position: number;
  priority?: 'high' | 'med' | 'low';
  scheduled?: string;
  meta: Record<string, unknown>;
};

export type EntryMessage = {
  id: string;
  entry_id: string;
  role: 'ai' | 'user';
  text: string;
  item_ref: string | null;        // entry_item id when message answers a specific prompt
  meta: Record<string, unknown>;
  created_at: string;
};
```

**Also create** `src/lib/threads.fixture.ts` — three threads (one per template, all owned by `sahdev`), one active entry each, plus 2–3 closed entries on the morning thread so chat scrollback has dividers to render. Realistic items, a handful of messages. B and C import this until your hooks are live.

## Tasks

### 1. Migration

Extend [`supabase/migrations/20260531_v2_threads.sql`](../../../supabase/migrations/20260531_v2_threads.sql) with the schema in the Data Model section of the design doc. Verbatim:

```sql
create type v2_thread_template as enum ('morning_ritual', 'evening_ritual', 'weekly_ritual');
create type v2_coach_id as enum ('nakula', 'bheem', 'arjun', 'yudi', 'sahdev');

create table v2_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  template    v2_thread_template not null,
  coach_id    v2_coach_id not null,
  tag         text not null,
  title       text,
  created_at  timestamptz default now()
);
create unique index v2_threads_user_template_idx on v2_threads (user_id, template);
create index v2_threads_user_coach_idx on v2_threads (user_id, coach_id);

create table v2_thread_entries (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references v2_threads on delete cascade,
  status      text not null default 'active',
  label       text,
  meta        jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  closed_at   timestamptz
);
create unique index v2_thread_entries_one_active_idx on v2_thread_entries (thread_id) where status = 'active';

create table v2_entry_items (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references v2_thread_entries on delete cascade,
  section     text,
  label       text not null,
  done        boolean default false,
  points      int default 0,
  position    int default 0,
  priority    text,
  scheduled   text,
  meta        jsonb default '{}'::jsonb
);
create index on v2_entry_items (entry_id, position);

create table v2_entry_messages (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references v2_thread_entries on delete cascade,
  role        text not null check (role in ('ai','user')),
  text        text not null,
  item_ref    uuid references v2_entry_items on delete set null,
  meta        jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);
create index on v2_entry_messages (entry_id, created_at);
```

Add RLS policies: `user_id = auth.uid()` on `v2_threads`; entries/items/messages join through `thread_id → user_id`.

Apply with the `supabase-query` skill (Supabase project `pedalbyxrzkltfbzbewc`, shared with V1).

### 2. FastAPI endpoints

Add to [`server/main.py`](../../../server/main.py) (currently only `/health`). Pydantic models should mirror `src/lib/threads.ts` exactly — snake_case on the wire, no camelCase translation.

```
GET    /threads                              → Thread[]
GET    /threads?coach_id=sahdev              → Thread[] filtered
GET    /threads/{thread_id}                  → { thread: Thread, entries: Entry[] }
GET    /entries/{entry_id}                   → { entry: Entry, items: EntryItem[], messages: EntryMessage[] }
POST   /threads/{thread_id}/entries          → Entry  (422 if active entry exists)
PATCH  /entries/{entry_id}/close             → Entry
PATCH  /entry_items/{item_id}                → EntryItem  (body: { done?, label?, ... })
POST   /entries/{entry_id}/messages          → EntryMessage  (body: { role, text, item_ref? })
```

Auth: if a logged-in user model isn't wired up yet, hard-code a dev `user_id` from env (`SAARTHI_DEV_USER_ID`) and leave a `# TODO: auth` comment. Don't block on this.

**Entry creation invariant:** `POST /threads/:id/entries` must surface the partial-unique-index violation as a 422 with `{ error: 'active_entry_exists', active_entry_id: '...' }`. Callers (workflows, UI buttons) decide whether to close-and-reopen.

### 3. React data hooks

Create `src/lib/threads.hooks.ts`:

```ts
export function useThreads(filter?: { coachId?: CoachId }): { data: Thread[] | null; loading: boolean; error: Error | null };
export function useThread(threadId: string): { thread: Thread | null; entries: Entry[]; loading: boolean; ... };
export function useEntry(entryId: string): { entry: Entry | null; items: EntryItem[]; messages: EntryMessage[]; ... };

// Mutations
export function useToggleItem(): (itemId: string, done: boolean) => Promise<void>;
export function useSendMessage(): (entryId: string, text: string, itemRef?: string) => Promise<EntryMessage>;
export function useOpenEntry(): (threadId: string, seed?: { items?: ...; messages?: ... }) => Promise<Entry>;
export function useCloseEntry(): (entryId: string) => Promise<Entry>;
```

Use the existing Supabase client at [`src/lib/supabase.ts`](../../../src/lib/supabase.ts) or fetch the FastAPI endpoints — your call. Whichever, the **return types must match the contract in `src/lib/threads.ts`** so B and C can swap fixture for hooks with no other changes.

### 4. Seed script

Create `scripts/seed-threads.ts` that, for the dev user, inserts a real-database mirror of `src/lib/threads.fixture.ts`. Idempotent (delete and re-insert is fine for dev).

## Acceptance

1. Migration applies cleanly to the shared Supabase project; the unique-active-entry index works (try inserting two `active` rows for one thread — should fail).
2. All endpoints round-trip the shared types: `GET /threads` → `Thread[]` with the right `coach_id`, `activeEntryId`, `lastEntryAt`; `GET /entries/:id` returns items + messages.
3. `POST /threads/:id/entries` returns 422 with `active_entry_exists` when an active entry exists.
4. A B/C component that switches its import from `./threads.fixture` to `./threads.hooks` renders identically (modulo timestamps).
5. `scripts/seed-threads.ts` populates the live DB for the dev user; the app (still on mock data) is unaffected.

## Pointers

- Master design: [`docs/threads-design.md`](../threads-design.md)
- Existing migration to extend: [`supabase/migrations/20260531_v2_threads.sql`](../../../supabase/migrations/20260531_v2_threads.sql)
- FastAPI entrypoint: [`server/main.py`](../../../server/main.py)
- Supabase client: [`src/lib/supabase.ts`](../../../src/lib/supabase.ts)
- Pandava (CoachId) source: [`src/constants/pandavas.ts`](../../../src/constants/pandavas.ts)
- Supabase project ID (shared with V1): `pedalbyxrzkltfbzbewc` — use the `supabase-query` skill
- V2 conventions: [`AGENT.md`](../../../AGENT.md), [`CLAUDE.md`](../../../CLAUDE.md), [`agent-memory/`](../../../agent-memory/)

## Open questions to flag (don't block on them)

- **Auth wiring** — if not yet present, use `SAARTHI_DEV_USER_ID` env var and tag with TODO. Don't invent an auth flow as part of this workstream.
- **Default coach mapping** — design doc assumes all three templates → `sahdev`. Confirm with the user before seeding if they want a different assignment.
- **Weekly review aggregation** — what exactly goes into the weekly entry's `meta` (last-7-day completion %, streaks, points)? Stub with an empty object if unclear; B will surface what it needs.
