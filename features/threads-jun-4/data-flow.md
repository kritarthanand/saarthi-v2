# Threads — Data Flow

> Companion to [threads-design.md](threads-design.md). That doc says *what* threads are. This doc says *how the data flows* from Supabase to the screen, end-to-end.

## Mental model recap

Three concentric things:

```
Thread     ← recurring conversation (one per template per user)
 └─ Entry   ← one instance of that conversation (one morning, one week)
     ├─ Items     ← checklist rows / reflection prompts
     └─ Messages  ← chat turns within that entry
```

- A thread has **at most one active entry** at a time (enforced by a partial unique index in the DB).
- Closing an entry freezes its items + messages as history; the thread itself never closes.
- Each thread is owned by one **Pandava** (coach).

## End-to-end picture

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────┐
│    Supabase      │   │    FastAPI       │   │  React (Expo / RN)   │
│                  │   │  server/main.py  │   │                      │
│ v2_threads       │◄──┤ /threads         │◄──┤ useThreads()         │
│ v2_thread_entries│◄──┤ /entries/:id     │◄──┤ useEntry(activeId)   │
│ v2_entry_items   │◄──┤ /entry_items/:id │◄──┤ useToggleItem()      │
│ v2_entry_messages│◄──┤ /entries/:id/    │◄──┤ useSendMessage()     │
│                  │   │   messages       │   │                      │
└──────────────────┘   └──────────────────┘   └──────────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  Adapter layer   │
                                              │  threadAdapter.ts│
                                              │  live → legacy   │
                                              │  Thread shape    │
                                              └──────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  UI components   │
                                              │  TodayView       │
                                              │  ThreadDetail    │
                                              │  *RitualSummary  │
                                              │  ThreadChat      │
                                              │  CoachDetail     │
                                              └──────────────────┘
```

## 1. Supabase (source of truth)

All thread data lives in four tables, namespaced `v2_*` since the project is shared with V1 (see [V2 Supabase namespacing memory](../../agent-memory/decisions.md)).

| Table                  | Holds                                                              |
|------------------------|--------------------------------------------------------------------|
| `v2_threads`           | One row per (user, template). Template enum + coach_id.            |
| `v2_thread_entries`    | One row per active/closed instance of a thread.                    |
| `v2_entry_items`       | Checklist rows / reflection prompts for an entry.                  |
| `v2_entry_messages`    | Chat turns within an entry. Role `'ai' \| 'user'`, optional `item_ref`. |

Key invariants enforced by the DB:
- `unique (user_id, template)` on `v2_threads` — one thread per template per user.
- `unique (thread_id) where status = 'active'` partial index on `v2_thread_entries` — at most one active entry per thread.
- RLS on every table — joined back through `thread_id → user_id = auth.uid()`.

Migration: [supabase/migrations/20260531_v2_threads.sql](../../supabase/migrations/20260531_v2_threads.sql).

## 2. FastAPI server ([server/main.py](../../server/main.py))

Thin layer over Supabase. Uses the service-role key to bypass RLS and enforces ownership in code via helper functions (`_assert_entry_owner`, `_assert_item_owner`). The dev user id comes from the `SAARTHI_DEV_USER_ID` env var until real auth lands.

Routes that drive the UI:

| Verb  | Path                            | Returns / does                                                |
|-------|---------------------------------|---------------------------------------------------------------|
| GET   | `/threads`                      | All of the user's threads (with `active_entry_id`).           |
| GET   | `/threads?coach_id=…`           | Filtered by coach — used by the Coach pane.                   |
| GET   | `/threads/:id`                  | One thread + its entries (active first, then closed desc).    |
| GET   | `/entries/:id`                  | One entry + its items + its messages.                         |
| POST  | `/threads/:id/entries`          | Opens a new entry. **422** with `active_entry_exists` if one already exists. |
| PATCH | `/entries/:id/close`            | Closes the active entry; sets `closed_at`.                    |
| PATCH | `/entry_items/:id`              | Toggle `done`, edit label, etc.                               |
| POST  | `/entries/:id/messages`         | Append a message (free-form chat or per-prompt with `item_ref`). |

Wire format is snake_case throughout. Mapping back to camelCase is done on the client (`toThread`, `toEntry`, etc. in `threads.hooks.ts`).

## 3. Shared TS contract ([src/lib/threads.ts](../../src/lib/threads.ts))

The integration boundary. Everything in the frontend that talks about a thread/entry/item/message agrees on these shapes:

```ts
export enum ThreadTemplate {
  MorningRitual = 'morning_ritual',
  EveningRitual = 'evening_ritual',
  WeeklyRitual  = 'weekly_ritual',
}

export type Thread       = { id; template; coach_id; tag; title; activeEntryId; lastEntryAt };
export type Entry        = { id; thread_id; status; label; meta; created_at; closed_at };
export type EntryItem    = { id; entry_id; section; label; done; points; position; … };
export type EntryMessage = { id; entry_id; role; text; item_ref; meta; created_at };
```

## 4. React hooks ([src/lib/threads.hooks.ts](../../src/lib/threads.hooks.ts))

The only place that touches the FastAPI surface. Components never call `fetch` directly.

### Query hooks

| Hook                                | Returns                                                                 |
|-------------------------------------|-------------------------------------------------------------------------|
| `useThreads(filter?)`               | `{ data: Thread[] \| null, loading, error, refetch }`. Optionally filtered by coach. |
| `useThread(threadId)`               | `{ thread, entries, loading, error, refetch }`. Skips when id is empty. |
| `useEntry(entryId)`                 | `{ entry, items, messages, loading, error, refetch }`. Skips when id is empty. |
| `useActiveEntries(threads)`         | `{ byId: Record<entryId, { entry, items, messages }>, loading, refetch }`. Batches per-active-entry fetches in parallel. Used by the Today list so each tile can show live points + counts. |

### Mutation hooks

| Hook                  | Action                                                          |
|-----------------------|-----------------------------------------------------------------|
| `useToggleItem()`     | `PATCH /entry_items/:id` with `{ done }`.                       |
| `useSendMessage()`    | `POST /entries/:id/messages` with `{ role:'user', text, item_ref? }`. |
| `useOpenEntry()`      | `POST /threads/:id/entries` — opens a fresh active entry.       |
| `useCloseEntry()`     | `PATCH /entries/:id/close`.                                     |

Every mutation flow is: **fire the API call → on success, refetch the relevant query hook**. There's no global state store — refetches push fresh data back through the same hooks. UI is optimistically updated where it matters (toggling a checkbox, sending a message) and reconciled when the refetch lands ~250ms later.

### `apiFetch`

Exported helper that all hooks (and any ad-hoc fetches like ThreadDetail's "load older entry") go through. It reads the proxy URL via `getProxyUrl()` (which is wrapped in try/catch to survive the worktree-AsyncStorage gotcha — see the [worktree-async-storage memory](../../agent-memory/decisions.md)).

## 5. Adapter ([src/lib/threadAdapter.ts](../../src/lib/threadAdapter.ts))

A temporary bridge from the live shape to the legacy mock-data `Thread` shape that downstream UI components still consume (`TodayView`, `ChatHistoryView`, `ThreadDetail`).

```
{ Thread, Entry, items[], messages[] }   ←  live (Supabase)
                  │
                  ▼  adaptLiveThread()
{ id, tag, kind, subtitle, items, messages, pointsEarned, pointsTotal, mantra, … }   ←  legacy Thread
```

Why this exists: keeps the migration diff small. Once the consuming components are migrated to the new types directly, the adapter goes away. Until then it's the seam.

The adapter derives **live** values:
- `subtitle` — `"X of Y done"` from current item state.
- `pointsEarned` / `pointsTotal` — summed live from items.
- `mantra` — read from `entry.meta.mantra`, falling back to a per-template default.

## 6. Where the data lands in the UI

| Component                              | Reads                                                                  |
|----------------------------------------|------------------------------------------------------------------------|
| [src/app/index.tsx](../../src/app/index.tsx) — root shell | `useThreads()` + `useActiveEntries()`, runs through the adapter, hands legacy `Thread[]` down. |
| [TodayView](../../src/components/today/TodayView.tsx)       | Renders one `ThreadCard` per thread.                                   |
| [ThreadCard](../../src/components/today/ThreadCard.tsx)     | Reads `livePoints(thread)` / `subtitleFor(thread)` (both now live via the adapter). |
| [ThreadDetail](../../src/components/thread/ThreadDetail.tsx) | `useThread(thread.id)` + `useEntry(activeEntry.id)`. Seeds optimistic `localItems` / `localMessages`. Dispatches to the per-template `SummaryView`. |
| [MorningRitualSummary](../../src/components/thread/MorningRitualSummary.tsx) / Evening / Weekly | Pure consumers — get `entry`, `items`, `messages`, plus callbacks. |
| [ThreadChat](../../src/components/thread/ThreadChat.tsx)    | Reads `messagesByEntry`. Lazy-loads older entries via `apiFetch` on scroll-up. |
| [CoachDetail](../../src/components/coaches/CoachDetail.tsx) | Reads its own filtered `useThreads({ coachId })` for the Threads block. |

## 7. Mutation flow (toggle an item — worked example)

1. User taps a checklist row in `MorningRitualSummary`.
2. `MorningRitualSummary` calls its `onToggle(itemId, done)` prop.
3. `ThreadDetail.handleRitualToggle` runs:
   - Updates `localItems` optimistically so the checkbox flips instantly.
   - Calls the parent's `onToggleItem(itemId)` prop.
4. `index.tsx`'s `toggleItem`:
   - `await useToggleItem()(itemId, !current)` → `PATCH /entry_items/:id`.
   - `refetchAll()` — re-pulls `useThreads` and `useActiveEntries`. The Today list points/subtitle update.
5. `ThreadDetail` separately calls `refetchActiveEntry()` ~250ms later to reconcile its own `useEntry` cache.

Result: instant UI feedback + server-of-truth reconciliation, no global store, no race-y double-write.

The same pattern applies to sending a free-form chat message (`useSendMessage`), answering a reflection prompt with `item_ref` set, opening a new entry, and closing one.

## 8. Dev-time seeding ([scripts/seed-threads.ts](../../scripts/seed-threads.ts))

Runs against the live Supabase project using the service-role key. For the dev user:
1. Deletes any existing v2 thread data (idempotent — safe to re-run).
2. Inserts the three template threads (all owned by `sahdev` by default).
3. Inserts one active entry per template, plus 2 closed entries on the morning thread (so chat scrollback has dividers to render).
4. Inserts items + messages mirroring [src/lib/threads.fixture.ts](../../src/lib/threads.fixture.ts).

Run with:
```bash
npx tsx --env-file=server/.env scripts/seed-threads.ts
```

Required env vars (in `server/.env`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SAARTHI_DEV_USER_ID`

Because the seed mirrors the fixture file, the content on screen often *looks* like the fixture. It's not — it's live in Supabase. Confirm by querying directly or by editing a row in the dashboard; the change appears in the app on the next refetch.

## 9. Tracing one trip — open `#MorningRitual`

```
User taps #MorningRitual on TodayView
   │
   ▼
index.tsx setOpenThreadId(thread.id)
   │
   ▼
ThreadDetail mounts with thread (legacy-shape, adapted)
   │
   ├──► useThread(thread.id)
   │      └─► GET /threads/<uuid>
   │          └─► returns { thread, entries: [active, closed, closed] }
   │
   └──► useEntry(activeEntry.id)
          └─► GET /entries/<active_entry_uuid>
              └─► returns { entry, items[], messages[] }
   │
   ▼
localItems / localMessages seeded from the response
   │
   ▼
TEMPLATE_REGISTRY[ThreadTemplate.MorningRitual].SummaryView
   = MorningRitualSummary
   │
   ▼
renders the points card, checklist rows, AI suggestion row
```

If the user opens the **Chat** tab, `ThreadChat` mounts and:
- Renders `messagesByEntry[activeEntry.id]` with a `[TEMPLATE] SESSION` pill.
- On scroll-up past the oldest loaded entry, calls `handleLoadOlderEntry` which `apiFetch`es the next closed entry's `/entries/:id` bundle and merges it into `loadedEntryMessages`.

## Known follow-ups

- **Adapter retirement**: `TodayView` / `ChatHistoryView` / `ThreadDetail` still consume the legacy `Thread` shape via `threadAdapter.ts`. Migrate them to the new `Thread` / `Entry` / `EntryItem` / `EntryMessage` types and the adapter goes away.
- **Voice notes**: ad-hoc voice-captured threads have no `template` yet. `handleSave` is currently stubbed (`console.warn`, drops the recording). Either add a `note` template or design a separate entity.
- **Snake-case wire vs. camelCase contract**: the server returns snake_case (`active_entry_id`), the TS contract uses camelCase (`activeEntryId`). Mapping happens in hook helpers (`toThread` etc.). Either flatten the server response or move all camelCase mapping to a single layer.
- **Optimistic write conflicts**: the current pattern is "fire-and-refetch with a 250ms delay." Under heavy network churn this can race. Move to a proper mutation-with-rollback library if/when it becomes a problem.
