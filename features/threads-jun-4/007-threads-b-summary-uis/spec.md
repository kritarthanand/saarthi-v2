# Spec — Workstream B: Per-Template Summary UIs

> **Read first:** [`docs/threads-design.md`](../threads-design.md) — the master design doc. This spec is one of three parallel workstreams (A/B/C) carved from it. Don't re-derive design decisions here; this spec assumes you've read it.

## What this workstream owns

Everything visible inside the **Summary** tab of a thread, plus the past-entries browser. The Summary tab is the **only** template-specific surface — header, tab bar, and Chat tab are not yours.

**In scope:**
- `TEMPLATE_REGISTRY` + Summary dispatcher inside `ThreadDetail`
- `MorningRitualSummary`, `EveningRitualSummary`, `WeeklyRitualSummary` components
- Entry-history sheet (triggered list of closed entries → child route rendering a frozen SummaryView)
- Folding the legacy `kind` field into `template`

**Out of scope:**
- Backend / schema / data hooks → Workstream A (see [`specs/006-threads-a-data-layer/spec.md`](../006-threads-a-data-layer/spec.md))
- Chat tab + Coach pane → Workstream C (see [`specs/008-threads-c-chat-and-coach/spec.md`](../008-threads-c-chat-and-coach/spec.md))
- `ThreadDetail` header / tab bar — leave the existing shell intact; only swap the body

## Step 0 — Shared contract (read or create)

You depend on `src/lib/threads.ts` and `src/lib/threads.fixture.ts` from Workstream A. If they exist, **import and conform**. If not, create them from the snippet below (B and C will see the same file and it must round-trip exactly).

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
  tag: string;
  title: string;
  activeEntryId: string | null;
  lastEntryAt: string | null;
};

export type Entry = {
  id: string;
  thread_id: string;
  status: 'active' | 'closed';
  label: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  closed_at: string | null;
};

export type EntryItem = {
  id: string;
  entry_id: string;
  section: string | null;
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
  item_ref: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};
```

Then create `src/lib/threads.fixture.ts` — three threads (one per template, all owned by `sahdev`), one active entry each, plus 2–3 closed entries on the morning thread. Items realistic enough to render all three Summary views. (Workstream C's chat needs the closed entries; you only need the active entry.)

**Throughout this workstream, your components import from `./threads.fixture` only.** Workstream A's real hooks will be swapped in at integration time.

## Tasks

### 1. `TEMPLATE_REGISTRY` + Summary dispatcher

Create `src/lib/threadTemplates.ts`:

```ts
import { ThreadTemplate, Entry, EntryItem } from './threads';

type TemplateConfig = {
  tag: string;
  title: string;
  SummaryView: React.ComponentType<{ entry: Entry; items: EntryItem[] }>;
};

export const TEMPLATE_REGISTRY: Record<ThreadTemplate, TemplateConfig> = {
  [ThreadTemplate.MorningRitual]: { tag: '#MorningRitual', title: 'Morning Ritual', SummaryView: MorningRitualSummary },
  [ThreadTemplate.EveningRitual]: { tag: '#EveningRitual', title: 'Evening Ritual', SummaryView: EveningRitualSummary },
  [ThreadTemplate.WeeklyRitual]:  { tag: '#WeeklyRitual',  title: 'Weekly Ritual',  SummaryView: WeeklyRitualSummary  },
};
```

Modify [`src/components/thread/ThreadDetail.tsx`](../../../src/components/thread/ThreadDetail.tsx): keep the existing header + Summary/Chat tab bar. Replace the current `kind`-based summary rendering with a dispatcher:

```tsx
const { SummaryView } = TEMPLATE_REGISTRY[thread.template];
{activeTab === 'summary' && <SummaryView entry={activeEntry} items={items} />}
```

**Fold `kind` into `template`** — remove the legacy `kind` field from any code you touch in this workstream. Anywhere else that still uses `kind`, leave a TODO.

### 2. `MorningRitualSummary` (port from existing)

The current Summary UI for the morning thread is the reference — see the screenshot in the design doc and the existing `MorningSummary` component (search `src/components/thread/`). Port it to a function taking `{ entry, items }` from the shared contract. Pieces:

- **Points card** at top: "X/Y done" + "X OF Y POINTS" + a coach-line subtitle + streak chip (`entry.meta.streak`)
- **Checklist rows** — one per item from `items`, sorted by `position`. Each shows label, `+points` badge, `chat` chip when `item.meta.has_chat === true`. Tapping a row toggles `done` (call a `onToggle(itemId, done)` prop; the parent in `ThreadDetail` will wire it to either the fixture's mutator or A's `useToggleItem()` at integration)
- **Inline AI suggestion row** at the bottom: orange dot + suggestion text + action chips. Sourced from the most recent `EntryMessage` with `role === 'ai'` and `meta.suggests === true`. Chips render from `meta.chip_labels: string[]`. Tapping a chip should fire `onSuggestionChoice(message, chipLabel)` — parent wires to `useSendMessage()` at integration

### 3. `EveningRitualSummary`

- Header strip: "wind-down + reflect"
- Reflection prompts as item rows (1–3 wins, where I got pulled off course, one thing for tomorrow, etc.) — items where `section === null`
- **Per-prompt composer**: when the user taps a row, a single-line text input expands. Submitting calls `onSendMessage(text, item.id)` — the parent wires it; the message will land as an `EntryMessage` with `item_ref = item.id`. The item flips to `done: true` once the user submits an answer (visually represented by reading `messages.some(m => m.item_ref === item.id)`)
- No points card by default (reflection isn't gamified). Confirm with user if uncertain — there's a flagged open question in the design doc

### 4. `WeeklyRitualSummary`

- Header strip: entry `label` (e.g. "Jun 1–7") + a row of compact stat chips driven by `entry.meta` (e.g. `meta.completion_pct`, `meta.points_total`, `meta.streak`). Render whatever keys are present; don't hardcode a schema for `meta` beyond the design doc's mention
- **Sub-tabs inside Summary**: `Review` | `Plan`. This is **internal** to your component — the top-level Summary/Chat tab bar in `ThreadDetail` stays the same across all templates
- Partition items by `section`: `'review'` items in the Review sub-tab, `'plan'` items in the Plan sub-tab
- Same row component as morning's checklist works fine here

### 5. Entry-history sheet

A triggered list of closed entries for the current thread. Trigger: a button in the header (gear menu is fine; or a small "history" affordance — pick what looks right with the existing shell).

- Sheet content: closed entries grouped by date (Today / This week / Earlier this month / `YYYY MMM`). Use the date-grouping pattern that exists in `HISTORY_DAYS` at [`src/lib/mockData.ts:287`](../../../src/lib/mockData.ts) as reference — you don't need to import from there, just steal the grouping logic
- Each row: entry label + one-line completion summary ("6 of 8 done" — derive from item count)
- Tap a closed entry → child route (Expo Router) rendering the same SummaryView with that entry's data, in a read-only mode (no `onToggle`, no composer)
- Phone: push a new screen. iPad/web: can stay as a side sheet — your call

## Acceptance

1. All three SummaryView components render correctly against `threads.fixture.ts` — no backend, no live data needed
2. Tab switching in `ThreadDetail` stays smooth (Summary body swaps, header + tab bar don't reflow)
3. Tapping a checklist item updates state locally (via the fixture's mutator); tapping again toggles back
4. `EveningRitualSummary`'s per-prompt composer accepts text and "answered" items render as done
5. Weekly's Review/Plan sub-tabs partition items correctly
6. Entry-history sheet lists at least the 2–3 closed morning-thread entries from the fixture; tapping one opens a frozen-data SummaryView
7. The `kind` field is gone from [`src/components/thread/ThreadDetail.tsx`](../../../src/components/thread/ThreadDetail.tsx) and anywhere else you touched. Lingering uses elsewhere have a TODO comment

## Integration

When Workstream A is ready, your SummaryView components stay unchanged. The parent (`ThreadDetail`) swaps `import { ... } from './threads.fixture'` for `import { ... } from './threads.hooks'` and wires the mutation callbacks (`onToggle`, `onSendMessage`, `onSuggestionChoice`) to `useToggleItem`, `useSendMessage`, etc. That's the entire integration step for B.

## Pointers

- Master design: [`docs/threads-design.md`](../threads-design.md)
- Existing thread shell to modify: [`src/components/thread/ThreadDetail.tsx`](../../../src/components/thread/ThreadDetail.tsx)
- Existing morning summary to port: search `src/components/thread/` for `MorningSummary` / `FocusSummary` / `NoteSummary`
- Legacy mock data (still in use; don't touch unless you're sure): [`src/lib/mockData.ts`](../../../src/lib/mockData.ts)
- Date-grouping reference: [`src/lib/mockData.ts:287`](../../../src/lib/mockData.ts)
- V2 conventions: [`AGENT.md`](../../../AGENT.md), [`CLAUDE.md`](../../../CLAUDE.md)
- Stack notes: Expo SDK 56+, Router, NativeWind v4, TS strict. When touching Expo/RN APIs, check https://docs.expo.dev/versions/v56.0.0/
