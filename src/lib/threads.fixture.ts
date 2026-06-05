import { ThreadTemplate } from './threads';
import type { Thread, Entry, EntryItem, EntryMessage } from './threads';

// ── Threads ───────────────────────────────────────────────────────────────────

export const FIXTURE_MORNING_THREAD: Thread = {
  id: 'fx-morning',
  template: ThreadTemplate.MorningRitual,
  coach_id: 'sahdev',
  tag: '#MorningRitual',
  title: 'Morning Ritual',
  activeEntryId: 'fx-morning-active',
  lastEntryAt: '2026-06-04T06:45:00Z',
};

export const FIXTURE_EVENING_THREAD: Thread = {
  id: 'fx-evening',
  template: ThreadTemplate.EveningRitual,
  coach_id: 'sahdev',
  tag: '#EveningRitual',
  title: 'Evening Ritual',
  activeEntryId: 'fx-evening-active',
  lastEntryAt: '2026-06-04T21:00:00Z',
};

export const FIXTURE_WEEKLY_THREAD: Thread = {
  id: 'fx-weekly',
  template: ThreadTemplate.WeeklyRitual,
  coach_id: 'sahdev',
  tag: '#WeeklyRitual',
  title: 'Weekly Ritual',
  activeEntryId: 'fx-weekly-active',
  lastEntryAt: '2026-06-01T10:00:00Z',
};

export const FIXTURE_THREADS: Thread[] = [
  FIXTURE_MORNING_THREAD,
  FIXTURE_EVENING_THREAD,
  FIXTURE_WEEKLY_THREAD,
];

// ── Entries ───────────────────────────────────────────────────────────────────

export const FIXTURE_MORNING_ENTRIES: Entry[] = [
  {
    id: 'fx-morning-entry-1',
    thread_id: 'fx-morning',
    status: 'closed',
    label: 'Mon Jun 3',
    meta: { streak: 11, completion_pct: 87 },
    created_at: '2026-06-03T06:00:00Z',
    closed_at: '2026-06-03T09:15:00Z',
  },
  {
    id: 'fx-morning-entry-2',
    thread_id: 'fx-morning',
    status: 'closed',
    label: 'Sun Jun 2',
    meta: { streak: 10, completion_pct: 100 },
    created_at: '2026-06-02T07:00:00Z',
    closed_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'fx-morning-active',
    thread_id: 'fx-morning',
    status: 'active',
    label: 'Wed Jun 4',
    meta: { streak: 12 },
    created_at: '2026-06-04T06:45:00Z',
    closed_at: null,
  },
];

export const FIXTURE_EVENING_ENTRIES: Entry[] = [
  {
    id: 'fx-evening-active',
    thread_id: 'fx-evening',
    status: 'active',
    label: 'Tonight',
    meta: {},
    created_at: '2026-06-04T21:00:00Z',
    closed_at: null,
  },
];

export const FIXTURE_WEEKLY_ENTRIES: Entry[] = [
  {
    id: 'fx-weekly-active',
    thread_id: 'fx-weekly',
    status: 'active',
    label: 'Jun 1–7',
    meta: { completion_pct: 73, points_total: 284, streak: 5 },
    created_at: '2026-06-01T10:00:00Z',
    closed_at: null,
  },
];

// ── Items ─────────────────────────────────────────────────────────────────────

export const FIXTURE_MORNING_ITEMS: EntryItem[] = [
  // Active entry items
  { id: 'fmi-1', entry_id: 'fx-morning-active', section: null, label: 'Cold shower', done: true, points: 6, position: 0, meta: {} },
  { id: 'fmi-2', entry_id: 'fx-morning-active', section: null, label: 'Meditation (10 min)', done: true, points: 8, position: 1, meta: {} },
  { id: 'fmi-3', entry_id: 'fx-morning-active', section: null, label: 'Journaling', done: false, points: 5, position: 2, meta: { has_chat: true } },
  { id: 'fmi-4', entry_id: 'fx-morning-active', section: null, label: 'Plan top 3 priorities', done: false, points: 7, position: 3, meta: { has_chat: true } },
  { id: 'fmi-5', entry_id: 'fx-morning-active', section: null, label: 'Workout', done: false, points: 10, position: 4, meta: {} },
  { id: 'fmi-6', entry_id: 'fx-morning-active', section: null, label: 'Read (20 min)', done: false, points: 5, position: 5, meta: {} },
  { id: 'fmi-7', entry_id: 'fx-morning-active', section: null, label: 'Vitamins', done: true, points: 3, position: 6, meta: {} },
  { id: 'fmi-8', entry_id: 'fx-morning-active', section: null, label: 'Review calendar', done: false, points: 2, position: 7, meta: {} },
  // Closed entry 1 (Mon Jun 3)
  { id: 'fmi-c1-1', entry_id: 'fx-morning-entry-1', section: null, label: 'Cold shower', done: true, points: 6, position: 0, meta: {} },
  { id: 'fmi-c1-2', entry_id: 'fx-morning-entry-1', section: null, label: 'Meditation (10 min)', done: true, points: 8, position: 1, meta: {} },
  { id: 'fmi-c1-3', entry_id: 'fx-morning-entry-1', section: null, label: 'Journaling', done: false, points: 5, position: 2, meta: {} },
  { id: 'fmi-c1-4', entry_id: 'fx-morning-entry-1', section: null, label: 'Plan top 3 priorities', done: true, points: 7, position: 3, meta: {} },
  { id: 'fmi-c1-5', entry_id: 'fx-morning-entry-1', section: null, label: 'Workout', done: true, points: 10, position: 4, meta: {} },
  { id: 'fmi-c1-6', entry_id: 'fx-morning-entry-1', section: null, label: 'Read (20 min)', done: false, points: 5, position: 5, meta: {} },
  { id: 'fmi-c1-7', entry_id: 'fx-morning-entry-1', section: null, label: 'Vitamins', done: true, points: 3, position: 6, meta: {} },
  { id: 'fmi-c1-8', entry_id: 'fx-morning-entry-1', section: null, label: 'Review calendar', done: false, points: 2, position: 7, meta: {} },
  // Closed entry 2 (Sun Jun 2) — perfect day
  { id: 'fmi-c2-1', entry_id: 'fx-morning-entry-2', section: null, label: 'Cold shower', done: true, points: 6, position: 0, meta: {} },
  { id: 'fmi-c2-2', entry_id: 'fx-morning-entry-2', section: null, label: 'Meditation (10 min)', done: true, points: 8, position: 1, meta: {} },
  { id: 'fmi-c2-3', entry_id: 'fx-morning-entry-2', section: null, label: 'Journaling', done: true, points: 5, position: 2, meta: {} },
  { id: 'fmi-c2-4', entry_id: 'fx-morning-entry-2', section: null, label: 'Plan top 3 priorities', done: true, points: 7, position: 3, meta: {} },
  { id: 'fmi-c2-5', entry_id: 'fx-morning-entry-2', section: null, label: 'Workout', done: true, points: 10, position: 4, meta: {} },
  { id: 'fmi-c2-6', entry_id: 'fx-morning-entry-2', section: null, label: 'Read (20 min)', done: true, points: 5, position: 5, meta: {} },
  { id: 'fmi-c2-7', entry_id: 'fx-morning-entry-2', section: null, label: 'Vitamins', done: true, points: 3, position: 6, meta: {} },
  { id: 'fmi-c2-8', entry_id: 'fx-morning-entry-2', section: null, label: 'Review calendar', done: true, points: 2, position: 7, meta: {} },
];

export const FIXTURE_EVENING_ITEMS: EntryItem[] = [
  { id: 'fei-1', entry_id: 'fx-evening-active', section: null, label: '1–3 wins from today', done: false, points: 0, position: 0, meta: {} },
  { id: 'fei-2', entry_id: 'fx-evening-active', section: null, label: 'Where I got pulled off course', done: false, points: 0, position: 1, meta: {} },
  { id: 'fei-3', entry_id: 'fx-evening-active', section: null, label: 'One thing for tomorrow', done: false, points: 0, position: 2, meta: {} },
  { id: 'fei-4', entry_id: 'fx-evening-active', section: null, label: 'Energy level (1–10)', done: false, points: 0, position: 3, meta: {} },
  { id: 'fei-5', entry_id: 'fx-evening-active', section: null, label: 'Gratitude: one moment', done: false, points: 0, position: 4, meta: {} },
];

export const FIXTURE_WEEKLY_ITEMS: EntryItem[] = [
  // Review section
  { id: 'fwi-r1', entry_id: 'fx-weekly-active', section: 'review', label: 'What worked this week', done: false, points: 0, position: 0, meta: {} },
  { id: 'fwi-r2', entry_id: 'fx-weekly-active', section: 'review', label: 'What slowed me down', done: false, points: 0, position: 1, meta: {} },
  { id: 'fwi-r3', entry_id: 'fx-weekly-active', section: 'review', label: 'One pattern to change', done: false, points: 0, position: 2, meta: {} },
  { id: 'fwi-r4', entry_id: 'fx-weekly-active', section: 'review', label: 'Biggest win of the week', done: true, points: 0, position: 3, meta: {} },
  // Plan section
  { id: 'fwi-p1', entry_id: 'fx-weekly-active', section: 'plan', label: 'Top 3 priorities for next week', done: false, points: 0, position: 0, priority: 'high', meta: {} },
  { id: 'fwi-p2', entry_id: 'fx-weekly-active', section: 'plan', label: 'One commitment to protect', done: false, points: 0, position: 1, priority: 'med', meta: {} },
  { id: 'fwi-p3', entry_id: 'fx-weekly-active', section: 'plan', label: 'One thing to say no to', done: true, points: 0, position: 2, meta: {} },
  { id: 'fwi-p4', entry_id: 'fx-weekly-active', section: 'plan', label: 'Stretch goal', done: false, points: 0, position: 3, priority: 'low', meta: {} },
];

// ── Messages ──────────────────────────────────────────────────────────────────

export const FIXTURE_MORNING_MESSAGES: EntryMessage[] = [
  {
    id: 'fmm-1',
    entry_id: 'fx-morning-active',
    role: 'ai',
    text: '"Plan top 3 priorities" — want me to pull them from your Focus thread?',
    item_ref: 'fmi-4',
    meta: { suggests: true, chip_labels: ['yes, pull them', "I'll do it manually", 'remind me at 9'] },
    created_at: '2026-06-04T06:50:00Z',
  },
];

export const FIXTURE_EVENING_MESSAGES: EntryMessage[] = [];
export const FIXTURE_WEEKLY_MESSAGES: EntryMessage[] = [];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export type FixtureBundle = {
  thread: Thread;
  entries: Entry[];
  items: EntryItem[];
  messages: EntryMessage[];
};

const BUNDLE_BY_TAG: Record<string, FixtureBundle> = {
  '#MorningRitual': {
    thread: FIXTURE_MORNING_THREAD,
    entries: FIXTURE_MORNING_ENTRIES,
    items: FIXTURE_MORNING_ITEMS,
    messages: FIXTURE_MORNING_MESSAGES,
  },
  '#EveningRitual': {
    thread: FIXTURE_EVENING_THREAD,
    entries: FIXTURE_EVENING_ENTRIES,
    items: FIXTURE_EVENING_ITEMS,
    messages: FIXTURE_EVENING_MESSAGES,
  },
  '#WeeklyRitual': {
    thread: FIXTURE_WEEKLY_THREAD,
    entries: FIXTURE_WEEKLY_ENTRIES,
    items: FIXTURE_WEEKLY_ITEMS,
    messages: FIXTURE_WEEKLY_MESSAGES,
  },
};

export function getFixtureBundle(tag: string): FixtureBundle | null {
  return BUNDLE_BY_TAG[tag] ?? null;
}
