# Threads — Recurring Conversations (Design Spec)

> Hand-off doc for a fresh Claude Code session. Self-contained: read this top to bottom and you have what you need to build.

## Context

Saarthi V2 ships a **threads UI** (iMessage-style persistent conversation spaces) as its core surface. Today the UI is wired to mock data in [`src/lib/mockData.ts`](../src/lib/mockData.ts) — no Supabase reads, no API. The migration [`supabase/migrations/20260531_v2_threads.sql`](../supabase/migrations/20260531_v2_threads.sql) exists but has not been applied.

This spec defines what threads actually are, the data model, and the per-template UI pattern. Building this replaces the mock data layer.

## Mental model

A **thread is a long, recurring conversation**. It's not a single instance — it's the *container* across all its instances.

- A thread has many **entries**. Each entry is one conversation (its own items, its own AI dialogue, its own messages).
- A thread is one of three **templates**: `morning_ritual`, `evening_ritual`, `weekly_ritual`. Each user has exactly one thread per template.
- A thread is **owned by one Pandava** (coach) — `nakula | bheem | arjun | yudi | sahdev`. The Pandava system already exists in code: see [`src/constants/pandavas.ts`](../src/constants/pandavas.ts). The Coach detail pane ([`src/components/coaches/CoachDetail.tsx`](../src/components/coaches/CoachDetail.tsx)) is where the user reaches their threads — each coach's pane lists the threads that belong to them.
- At any time, a thread has **at most one active entry**. Starting a new entry requires closing the current one (`status: active → closed`).
- Closing an entry freezes its items and messages as history. The thread itself never closes.
- When/whether a new entry is opened is **not the schema's concern**. That's handled by an external workflow, a cron, a Supabase function, or a manual UI action. The DB just enforces "one active at a time per thread."

```
User
 └─ Thread (template = morning_ritual)
     ├─ Entry 1  (closed, Jun 1)
     │   ├─ items
     │   └─ messages
     ├─ Entry 2  (closed, Jun 2)
     │   ├─ items
     │   └─ messages
     └─ Entry 3  (active, Jun 3)
         ├─ items
         └─ messages
```

**Out of scope (do not build):**
- Ad-hoc / one-off threads. Every thread is one of the three templates.
- Cadence fields, `unlocks_at`, scheduling logic — pushed out to the layer that creates entries.

## Data model

Extend the existing migration ([`supabase/migrations/20260531_v2_threads.sql`](../supabase/migrations/20260531_v2_threads.sql)). All tables prefixed `v2_` per [the V2 namespacing rule](../agent-memory/decisions.md).

```sql
create type v2_thread_template as enum (
  'morning_ritual',
  'evening_ritual',
  'weekly_ritual'
);

-- Coach (Pandava) ids — matches CoachId in src/constants/pandavas.ts.
-- Use an enum now; swap for FK to v2_coaches when that table lands.
create type v2_coach_id as enum (
  'nakula', 'bheem', 'arjun', 'yudi', 'sahdev'
);

-- The recurring conversation itself.
create table v2_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  template    v2_thread_template not null,
  coach_id    v2_coach_id not null,    -- which Pandava owns this thread
  tag         text not null,           -- '#MorningRitual'
  title       text,                    -- 'Morning Ritual'
  created_at  timestamptz default now()
);
-- One thread per template per user.
create unique index v2_threads_user_template_idx
  on v2_threads (user_id, template);
-- Fast lookup of all threads owned by a coach (used by the Coach pane).
create index v2_threads_user_coach_idx
  on v2_threads (user_id, coach_id);

-- One instance of the conversation.
create table v2_thread_entries (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references v2_threads on delete cascade,
  status      text not null default 'active',  -- 'active' | 'closed'
  label       text,                            -- 'Wed Jun 4', 'Jun 1–7'; supplied by creator
  meta        jsonb default '{}'::jsonb,       -- template-specific extras
  created_at  timestamptz default now(),
  closed_at   timestamptz
);
-- At most one active entry per thread.
create unique index v2_thread_entries_one_active_idx
  on v2_thread_entries (thread_id) where status = 'active';

-- Items belonging to an entry (checklist rows, reflection prompts, etc.).
create table v2_entry_items (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references v2_thread_entries on delete cascade,
  section     text,                    -- weekly: 'review' | 'plan'; daily templates: null
  label       text not null,
  done        boolean default false,
  points      int default 0,
  position    int default 0,
  priority    text,                    -- 'high' | 'med' | 'low'
  scheduled   text,                    -- free-form time hint, e.g. '10:00–12:00'
  meta        jsonb default '{}'::jsonb
);
create index on v2_entry_items (entry_id, position);

-- Chat messages within an entry.
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

RLS: standard `user_id = auth.uid()` on `v2_threads`; entries/items/messages join through `thread_id → user_id`.

## UI shell (already built — wire into it, don't replace it)

The current `ThreadDetail` shell at [`src/components/thread/ThreadDetail.tsx`](../src/components/thread/ThreadDetail.tsx) already defines the layout that every template will use:

```
┌──────────────────────────────────────┐
│ • #MorningRitual          [⚙]        │  ← header (shared)
│   6 of 8 done · feels good           │
├──────────────────────────────────────┤
│       Summary    │    Chat  10       │  ← tab bar (shared)
├──────────────────────────────────────┤
│                                      │
│   (template-specific Summary view)   │  ← custom per template
│             OR                       │
│   (shared chat transcript)           │  ← same component for all templates
│                                      │
└──────────────────────────────────────┘
```

**Header** (tag, subtitle, gear) and **tab bar** (Summary / Chat) are shared across all three templates. Only the body changes:

- **Summary tab** → a **custom component per template** (the "custom html" — a React component, but the shape is fully template-specific). Reads `v2_entry_items` for the active entry, plus whatever template-specific structure it cares about.
- **Chat tab** → a **single shared component**, identical layout for all three templates. Reads `v2_entry_messages` and renders the standard transcript (AI left, user right, timestamps, `meta` subtext).

This means a template's "View" is really just its **SummaryView**. Chat doesn't need to be in the registry.

## Frontend: enum + SummaryView registry

The template field is a **discriminator**. Each template registers its `SummaryView` and metadata; the chat component is shared and pulled in directly by the shell.

```ts
// src/lib/threadTemplates.ts
export enum ThreadTemplate {
  MorningRitual = 'morning_ritual',
  EveningRitual = 'evening_ritual',
  WeeklyRitual  = 'weekly_ritual',
}

type TemplateConfig = {
  tag: string;                  // '#MorningRitual'
  title: string;                // 'Morning Ritual'
  SummaryView: React.ComponentType<{ entry: Entry; items: EntryItem[] }>;
  // Optional: extra Summary-level tabs beyond Summary/Chat (e.g. weekly's Review/Plan
  // might live as sub-tabs inside SummaryView instead — see "Per-template UIs" below).
};

export const TEMPLATE_REGISTRY: Record<ThreadTemplate, TemplateConfig> = {
  [ThreadTemplate.MorningRitual]: { tag: '#MorningRitual', title: 'Morning Ritual', SummaryView: MorningRitualSummary },
  [ThreadTemplate.EveningRitual]: { tag: '#EveningRitual', title: 'Evening Ritual', SummaryView: EveningRitualSummary },
  [ThreadTemplate.WeeklyRitual]:  { tag: '#WeeklyRitual',  title: 'Weekly Ritual',  SummaryView: WeeklyRitualSummary  },
};
```

`ThreadDetail` becomes a dispatcher *inside its existing tab shell* — header and tab bar stay where they are; only the body switches:

```tsx
// inside ThreadDetail.tsx
const { SummaryView } = TEMPLATE_REGISTRY[thread.template];

return (
  <ThreadShell header={<ThreadHeader thread={thread} />} tabs={['Summary', 'Chat']}>
    {tab === 'Summary' && <SummaryView entry={activeEntry} items={items} />}
    {tab === 'Chat'    && <ThreadChat thread={thread} entries={entries} />}
  </ThreadShell>
);
```

The current `kind` field on the mock `Thread` type folds into `template` — they're doing the same job. Remove `kind`.

## Per-template Summary UIs

Each one is the **body** of the Summary tab. Header and tab bar are owned by the shell.

### MorningRitualSummary (matches existing screenshot)
- Big **points card** at top: "0/8 done" + "0 OF 46 POINTS" + 1-line streak/coach line ("8 left — knocking them out before lunch keeps the streak.") + "day 12 streak"
- **Checklist rows** below — one per `v2_entry_items` row. Each shows label, `+points` badge, `chat` chip if `meta.has_chat`
- **Inline AI suggestion row** at the bottom (orange dot + suggestion text + action chips like `yes, pull them` / `I'll do it manually` / `remind me at 9`). Sourced from the most recent unresolved AI message in `v2_entry_messages` with `meta.suggests = true` — tapping a chip posts a user message back
- Reads only the active entry's items + messages

### EveningRitualSummary
- Header strip: "wind-down + reflect"
- Reflection prompts as item rows (1–3 wins, where I got pulled off course, one thing for tomorrow, etc.)
- Each prompt has its own per-item composer (the `hasChat` pattern already on item `m5` in the mock). User's typed answer becomes a `v2_entry_messages` row with `item_ref = item.id` and the item flips to `done`
- No points card by default (reflection isn't gamified the same way) — confirm with user

### WeeklyRitualSummary
- Header strip: entry `label` (e.g. "Jun 1–7") + last-7-days roll-up chips (total points, days completed, streak)
- **Sub-tabs inside Summary**: **Review** | **Plan** (so the top-level tab bar stays Summary / Chat across all three templates)
- Items partitioned by `section` column: `'review'` and `'plan'`
- Review section pre-populates from aggregating the week's morning + evening entries (completion %, points totals, missed-day count). That aggregate lives in `entry.meta` and is computed at entry-creation time so the UI just renders it

## Chat tab (shared across all templates)

One component, identical layout regardless of template. Reads `v2_entry_messages` for **all entries in the thread**, ordered by `created_at`. AI messages left-aligned, user messages right-aligned, timestamps + optional `meta` subline ("morning: ritual_setup").

**Entry boundaries are rendered as session-divider pills** (visible in the current Chat tab screenshot as the orange `MORNINGRITUAL SESSION` pill). One pill at the start of each entry — derived from grouping messages by `entry_id`. Pill label can come from `entry.label`, falling back to "[TEMPLATE] SESSION".

```
─── MORNINGRITUAL SESSION ───        ← v2_thread_entries row N (oldest visible)
ai:   Good morning ✦ ...
me:   Yes but skip the cold shower
ai:   Got it — pulling cold shower.
...

─── MORNINGRITUAL SESSION ───        ← v2_thread_entries row N+1
ai:   ...next day...
```

This means the Chat tab gives you free history scrollback — you can scroll up through every past entry's conversation without ever leaving the thread. The Summary tab is always pinned to the **active entry** (you don't browse past summaries there).

Implementation hint: paginate by entry, not by message. Load the active entry's messages first, then lazy-load older entries as the user scrolls up.

## Navigation pattern

The existing master/detail shell at [`src/app/index.tsx`](../src/app/index.tsx) already gives us most of it. Mapping the recurring-entry model onto it:

1. **Thread list** — rows for the three threads. Preview shows the **active entry**.
   - Morning: "Wed · 6 of 8 done"
   - Evening: "Tonight · wind-down + reflect"
   - Weekly: "Jun 1–7 · review + plan"

2. **Thread detail** — opens to the **active entry**:
   - **Summary tab**: shows only the active entry (custom per template, per above).
   - **Chat tab**: shows the full thread history as one scroll with `[TEMPLATE] SESSION` pill dividers between entries. Scroll up to see past sessions.

3. **Past entry browse** — when the user wants to revisit a closed entry's *summary* (not just its chat), there's an entries picker. Two options to confirm with the user:
   - **(a)** A history sheet/drawer triggered from the header gear or a dedicated affordance, listing closed entries. Tap one → opens that entry in a child route, with the same SummaryView frozen to that entry's data.
   - **(b)** Closed-entry list rendered inline below the active entry on the Summary tab (matches the original sketch in this doc).

   Default recommendation: **(a)**. Keeps the Summary tab focused on "now," reuses the chat-tab scrollback for retrospective reading, and avoids a wall of 300+ rows on Morning/Evening. The grouping pattern for the history sheet (Today / Yesterday / This week / Earlier this month / March 2026) already exists in `HISTORY_DAYS` at [`src/lib/mockData.ts:287`](../src/lib/mockData.ts).

The current `ChatHistoryView` becomes redundant for ritual threads (history lives inside each thread). It stays useful later as a cross-thread feed/search.

## Pandava (coach) ownership

Every thread belongs to one Pandava via `v2_threads.coach_id`. The mapping isn't enforced by the schema (any coach can own any template), but the default seeded assignment is:

| Template         | Default coach | Why                                        |
|------------------|---------------|--------------------------------------------|
| `morning_ritual` | `sahdev`      | Sahdev owns "Daily / Weekly Review" sadhana |
| `evening_ritual` | `sahdev`      | Same — daily review loop                    |
| `weekly_ritual`  | `sahdev`      | Weekly Review explicitly                    |

(Confirm with the user — Yudi or Bheem might own Morning depending on framing. The schema lets you change this per-user without code changes.)

**Coach detail pane integration** — [`src/components/coaches/CoachDetail.tsx`](../src/components/coaches/CoachDetail.tsx) is the home for a coach's threads. New section in that pane:

```
┌─ Sahdev · building Saarthi ──────┐
│ Spirit · Visual · Sadhanas …    │
├─────────────────────────────────┤
│ Threads                          │  ← new section
│ ▸ #MorningRitual  · 6 of 8 done │
│ ▸ #EveningRitual  · locked      │
│ ▸ #WeeklyRitual   · Jun 1–7     │
└─────────────────────────────────┘
```

Tapping a thread row opens `ThreadDetail` for it — same component used from the main thread list. From a navigation standpoint a thread is reachable from two places (main list + its coach's pane); both routes resolve to the same `ThreadDetail`.

## API surface (FastAPI)

Server lives at [`server/main.py`](../server/main.py) — currently only `/health`. Add:

```
GET    /threads                              → user's three threads with active-entry preview
GET    /threads?coach_id=sahdev              → same, filtered to one Pandava (Coach pane uses this)
GET    /threads/:thread_id                   → thread + entries[] (active first, then closed desc)
GET    /entries/:entry_id                    → entry + items[] + messages[]
POST   /threads/:thread_id/entries           → open a new entry (422 if one is active)
PATCH  /entries/:entry_id/close              → close active entry
PATCH  /entry_items/:item_id                 → toggle done / edit
POST   /entries/:entry_id/messages           → append user message; backend may append AI reply
```

Entry creation (when a workflow or button opens a new morning/evening/weekly entry) goes through `POST /threads/:thread_id/entries`. The body carries `label`, optional seed `items`, optional seed `messages`, optional `meta`. The endpoint enforces the one-active invariant; if violated, returns 422 with the active entry's id so the caller can decide.

## Build plan: 3 parallel workstreams

The work splits cleanly into three independent workstreams once a tiny shared-contract step is done up front. Without that step, the workstreams collide on TS type definitions; with it, they're truly parallel and integrate by swapping a single import.

### Step 0 — Shared contract (must land first, ~30 min)

Hand-write the TS type module at `src/lib/threads.ts`:

```ts
export enum ThreadTemplate { MorningRitual = 'morning_ritual', EveningRitual = 'evening_ritual', WeeklyRitual = 'weekly_ritual' }
export type CoachId = 'nakula' | 'bheem' | 'arjun' | 'yudi' | 'sahdev';

export type Thread       = { id: string; template: ThreadTemplate; coach_id: CoachId; tag: string; title: string; activeEntryId: string | null; lastEntryAt: string | null; };
export type Entry        = { id: string; thread_id: string; status: 'active' | 'closed'; label: string | null; meta: Record<string, unknown>; created_at: string; closed_at: string | null; };
export type EntryItem    = { id: string; entry_id: string; section: string | null; label: string; done: boolean; points: number; position: number; priority?: 'high'|'med'|'low'; scheduled?: string; meta: Record<string, unknown>; };
export type EntryMessage = { id: string; entry_id: string; role: 'ai' | 'user'; text: string; item_ref: string | null; meta: Record<string, unknown>; created_at: string; };
```

Also commit a fixture at `src/lib/threads.fixture.ts` that satisfies these types — three threads (one per template, all owned by `sahdev`), one active entry each, a couple of closed entries on the morning thread so the chat session-divider UI has data. Workstreams B and C will import this fixture until A is ready.

### Workstream A — Data layer (Supabase + FastAPI + data hook + seed)

Owns the entire backend and the React data hook.

1. Extend [`supabase/migrations/20260531_v2_threads.sql`](../supabase/migrations/20260531_v2_threads.sql) with the schema in the Data Model section. Apply.
2. FastAPI Pydantic models matching `src/lib/threads.ts` exactly (camelCase ↔ snake_case translation layer if needed). Implement endpoints in the API Surface section. Skip auth wiring if not in place; tag with TODO.
3. `useThreads()`, `useThread(threadId)`, `useEntry(entryId)` hooks in `src/lib/threads.hooks.ts` that hit the endpoints. They return the shared types from Step 0.
4. Seed script at `scripts/seed-threads.ts` mirroring `threads.fixture.ts` against the real Supabase project.

**Done when:** swapping `import {...} from './threads.fixture'` for the hooks renders the same UI in B and C.

### Workstream B — Per-template Summary UIs (registry + 3 SummaryViews + history sheet)

Owns everything visible inside the Summary tab plus the past-entries browser.

1. Build `TEMPLATE_REGISTRY` in `src/lib/threadTemplates.ts` (signature in the registry section above). Wire the Summary dispatcher into [`src/components/thread/ThreadDetail.tsx`](../src/components/thread/ThreadDetail.tsx) so the header + tab bar stay put and only the Summary body switches by template. Fold the legacy `kind` field into `template`.
2. **MorningRitualSummary** — port from the existing `MorningSummary` component. Points card, checklist rows, inline AI suggestion row with chips.
3. **EveningRitualSummary** — reflection prompts as items with per-prompt composer (writes `EntryMessage` rows with `item_ref` set; item flips `done`).
4. **WeeklyRitualSummary** — Review/Plan sub-tabs inside Summary, partition items by `section`, render `entry.meta` aggregates as the Review header strip.
5. **Entry history sheet** — triggered from the header gear, lists closed entries grouped (Today / This week / Earlier this month / `YYYY-MM`). Tap → child route rendering the same SummaryView frozen to that closed entry's data.

**Imports `threads.fixture.ts` throughout. No backend dependency.**

### Workstream C — Shared chat + Coach pane integration

Owns the cross-cutting UI: the chat tab (used by every template) and the Threads block inside the Coach detail pane.

1. **Shared Chat tab** — single `ThreadChat` component rendering messages from **all entries** in the thread in one scroll, with `[TEMPLATE] SESSION` pill dividers between entries (driven by `EntryMessage.entry_id` group boundaries). Pill label from `Entry.label` with `[TEMPLATE] SESSION` fallback. Paginate by entry: newest entry first, lazy-load older entries on upward scroll.
2. **Coach-pane Threads section** — add a `Threads` block to [`src/components/coaches/CoachDetail.tsx`](../src/components/coaches/CoachDetail.tsx). Lists the threads where `Thread.coach_id` matches the current coach; row renders tag + active-entry preview; tap routes into `ThreadDetail`.

**Imports `threads.fixture.ts` throughout. No backend dependency.**

### Integration

When all three workstreams are done: in B's and C's components, change `from './threads.fixture'` to `from './threads.hooks'`. That's the entire integration step. The fixture can stay in the repo as a test/storybook helper.

### Independence summary

| | A | B | C |
|---|---|---|---|
| Depends on Step 0 contract | ✓ | ✓ | ✓ |
| Depends on the other workstreams | — | — | — |
| Touches Supabase / server | ✓ | — | — |
| Touches per-template Summary code | — | ✓ | — |
| Touches Chat tab / Coach pane | — | — | ✓ |

After Step 0, the three are independent in source files touched, knowledge required, and merge surface. Two of them (B and C) ship against the fixture; A makes the data real.

## Open questions to surface before implementing

- **Auth**: is there a logged-in user model wired up yet, or does seeding need a fixed dev `user_id`? Check [`src/lib/supabase.ts`](../src/lib/supabase.ts) and `server/`.
- **Entry creation trigger**: confirm with the user where the "open new entry" call comes from for each template (manual UI button vs. external workflow). The schema doesn't care, but the seed/dev-loop story does.
- **Weekly review aggregation**: when a weekly entry is created, what data goes into `meta`? Probably last-7-days completion %, points, streak — confirm before building the Review tab.
- **Coach assignment**: confirm the default coach for each template (current doc assumes all three → `sahdev`; user may want morning → Yudi/Bheem for example).

## Pointers

- Repo entrypoint: [`AGENT.md`](../AGENT.md), [`CLAUDE.md`](../CLAUDE.md)
- Current UI state of threads: [`src/app/index.tsx`](../src/app/index.tsx), [`src/components/thread/ThreadDetail.tsx`](../src/components/thread/ThreadDetail.tsx)
- Pandava system: [`src/constants/pandavas.ts`](../src/constants/pandavas.ts), [`src/components/coaches/CoachesPane.tsx`](../src/components/coaches/CoachesPane.tsx), [`src/components/coaches/CoachDetail.tsx`](../src/components/coaches/CoachDetail.tsx)
- Mock data being replaced: [`src/lib/mockData.ts`](../src/lib/mockData.ts)
- Existing (unapplied) migration: [`supabase/migrations/20260531_v2_threads.sql`](../supabase/migrations/20260531_v2_threads.sql)
- Supabase project (shared with V1): `pedalbyxrzkltfbzbewc` — use the `supabase-query` skill to run SQL
