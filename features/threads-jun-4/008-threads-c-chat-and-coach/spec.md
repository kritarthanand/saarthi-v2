# Spec — Workstream C: Shared Chat + Coach Pane Integration

> **Read first:** [`docs/threads-design.md`](../threads-design.md) — the master design doc. This spec is one of three parallel workstreams (A/B/C) carved from it. Don't re-derive design decisions here; this spec assumes you've read it.

## What this workstream owns

The two cross-cutting UI surfaces: the **Chat** tab (shared by every template — same component, no per-template customization) and the new **Threads** block inside the Coach detail pane.

**In scope:**
- `ThreadChat` — the shared Chat tab component, with `[TEMPLATE] SESSION` pill dividers between entries and lazy pagination by entry
- Coach-pane Threads section in [`src/components/coaches/CoachDetail.tsx`](../../../src/components/coaches/CoachDetail.tsx)

**Out of scope:**
- Backend / schema / data hooks → Workstream A (see [`specs/006-threads-a-data-layer/spec.md`](../006-threads-a-data-layer/spec.md))
- Per-template Summary view components → Workstream B (see [`specs/007-threads-b-summary-uis/spec.md`](../007-threads-b-summary-uis/spec.md))
- Anything inside the Summary tab — leave it alone, B owns it

## Step 0 — Shared contract (read or create)

You depend on `src/lib/threads.ts` and `src/lib/threads.fixture.ts` from Workstream A. If they exist, **import and conform**. If not, create them from the snippet below (the same snippet appears in A's and B's specs and must round-trip exactly).

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

Then create `src/lib/threads.fixture.ts` — three threads (one per template, all owned by `sahdev`), one active entry each, plus **2–3 closed entries on the morning thread with 4–6 messages each**. The closed-entry chat history is what makes your session-divider pill design actually testable. Realistic conversation content (port a few lines from `THREAD_CHATS` in [`src/lib/mockData.ts:253`](../../../src/lib/mockData.ts) if you want).

**Throughout this workstream, your components import from `./threads.fixture` only.** Workstream A's real hooks will be swapped in at integration time.

## Tasks

### 1. `ThreadChat` — the shared Chat tab

Create `src/components/thread/ThreadChat.tsx`. One component, identical layout regardless of template.

**Props:**
```ts
type ThreadChatProps = {
  thread: Thread;
  entries: Entry[];          // sorted newest-first
  messagesByEntry: Record<string, EntryMessage[]>;  // entries you've loaded so far
  onSend: (text: string, itemRef?: string) => Promise<void>;
  onLoadOlderEntry?: () => void;   // called when user scrolls past oldest loaded entry
};
```

**Layout:**
- Scrollable transcript (newest at bottom — chat-style)
- AI messages left-aligned, user messages right-aligned, timestamps + optional `meta`-derived subline (e.g. `"morning: ritual_setup"` when `meta.tag` is present — see existing mock format in `THREAD_CHATS`)
- **Entry-boundary pill dividers**: one pill at the top of each entry's message group. Pill label is `entry.label ?? defaultLabel(thread.template)` where `defaultLabel` returns `'MORNINGRITUAL SESSION'` / `'EVENINGRITUAL SESSION'` / `'WEEKLYRITUAL SESSION'` (match the existing pill style in the screenshot from the design doc — orange filled pill with uppercase text)
- Composer pinned at the bottom; submitting calls `onSend(text)` (no `item_ref` for free-form chat sends; the per-prompt composer for evening reflections is B's concern, not yours)

**Pagination:**
- The newest entry's messages are passed in initially. When the user scrolls **up past the oldest currently-loaded entry's first message**, call `onLoadOlderEntry()` — the parent will fetch the next-older entry and re-render with it merged into `messagesByEntry`
- Render only the entries you have messages for; don't show placeholder pills for unloaded entries

**Reference screenshot** in the design doc shows what the rendered chat should look like (single `MORNINGRITUAL SESSION` pill at top, AI/user bubbles, timestamps, `meta` sublines).

**Wire into [`src/components/thread/ThreadDetail.tsx`](../../../src/components/thread/ThreadDetail.tsx):** when the active tab is `Chat`, render `<ThreadChat thread={thread} entries={entries} messagesByEntry={...} onSend={...} />`. Don't touch the Summary path — B owns that.

### 2. Coach-pane Threads section

Add a `Threads` block to [`src/components/coaches/CoachDetail.tsx`](../../../src/components/coaches/CoachDetail.tsx). Place it after the existing Spirit / Visual / Sadhanas content (or wherever it slots in best — read the file and pick).

**Layout:**
```
Threads
▸ #MorningRitual  · 6 of 8 done
▸ #EveningRitual  · locked
▸ #WeeklyRitual   · Jun 1–7
```

**Data:**
- Read all threads where `Thread.coach_id === coach.id` (use the fixture; A's `useThreads({ coachId })` slots in at integration)
- For each row: thread `tag`, then a one-line preview derived from the **active entry** (`activeEntryId`). If you can read the active entry inline from the fixture, render `"X of Y done"` for checklist-style entries, `"label"` for weekly. If no active entry, show "no active session."

**Navigation:**
- Tap a row → open `ThreadDetail` for that thread. Route same as the main thread list uses (read [`src/app/index.tsx`](../../../src/app/index.tsx) to see how thread selection currently propagates — wire into the same mechanism so back-button behavior is consistent). On iPad/web master-detail, opening from the coach pane should still take over the right pane like a normal thread tap

## Acceptance

1. `ThreadChat` renders the active entry's messages, plus any closed-entry messages that have been loaded, separated by `[TEMPLATE] SESSION` pill dividers
2. Scrolling up past the oldest loaded entry triggers `onLoadOlderEntry()` (verifiable via a console log or a parent that mutates fixture state)
3. The composer submits via `onSend`; new messages appear at the bottom
4. The Coach pane shows a Threads block listing the (1+ depending on assignment) threads owned by that coach, with live previews from active entries
5. Tapping a thread row from the Coach pane opens `ThreadDetail` and navigates back correctly
6. Switching between Summary and Chat in `ThreadDetail` doesn't reflow the header or tab bar — only the body changes

## Integration

When Workstream A is ready: in `ThreadDetail` (your wiring point for `ThreadChat`) and `CoachDetail` (the Threads block), swap `import { ... } from './threads.fixture'` for `from './threads.hooks'`. Wire `onSend` → `useSendMessage`, `onLoadOlderEntry` → fetch the next older entry's messages and merge. That's the entire integration step for C.

## Pointers

- Master design: [`docs/threads-design.md`](../threads-design.md)
- Existing thread shell to wire into: [`src/components/thread/ThreadDetail.tsx`](../../../src/components/thread/ThreadDetail.tsx)
- Existing chat tab implementation (for reference / styling cues): search `src/components/thread/` for `ThreadChatTab`
- Coach pane to extend: [`src/components/coaches/CoachDetail.tsx`](../../../src/components/coaches/CoachDetail.tsx) and surrounding [`src/components/coaches/CoachesPane.tsx`](../../../src/components/coaches/CoachesPane.tsx)
- Thread-list → detail wiring to reuse: [`src/app/index.tsx`](../../../src/app/index.tsx)
- Pandava constants (for `CoachId` and coach colors): [`src/constants/pandavas.ts`](../../../src/constants/pandavas.ts)
- Existing chat message mock data (steal styling cues + a few lines for the fixture): [`src/lib/mockData.ts:253`](../../../src/lib/mockData.ts)
- V2 conventions: [`AGENT.md`](../../../AGENT.md), [`CLAUDE.md`](../../../CLAUDE.md)
- Stack notes: Expo SDK 56+, Router, NativeWind v4, TS strict. When touching Expo/RN APIs, check https://docs.expo.dev/versions/v56.0.0/
