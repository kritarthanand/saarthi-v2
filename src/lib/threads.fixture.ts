import { ThreadTemplate, type Thread, type Entry, type EntryItem, type EntryMessage } from './threads';

// ─── Threads ─────────────────────────────────────────────────────────────────

export const FIXTURE_THREADS: Thread[] = [
  {
    id: 'fixture-thread-morning',
    template: ThreadTemplate.MorningRitual,
    coach_id: 'sahdev',
    tag: '#MorningRitual',
    title: 'Morning Ritual',
    activeEntryId: 'fixture-entry-morning-active',
    lastEntryAt: '2026-06-04T07:02:00.000Z',
  },
  {
    id: 'fixture-thread-evening',
    template: ThreadTemplate.EveningRitual,
    coach_id: 'sahdev',
    tag: '#EveningRitual',
    title: 'Evening Ritual',
    activeEntryId: 'fixture-entry-evening-active',
    lastEntryAt: '2026-06-04T21:00:00.000Z',
  },
  {
    id: 'fixture-thread-weekly',
    template: ThreadTemplate.WeeklyRitual,
    coach_id: 'sahdev',
    tag: '#WeeklyRitual',
    title: 'Weekly Ritual',
    activeEntryId: 'fixture-entry-weekly-active',
    lastEntryAt: '2026-06-01T09:00:00.000Z',
  },
];

// ─── Entries ──────────────────────────────────────────────────────────────────

// Morning — active + 2 closed (gives chat tab session-divider data)
const MORNING_ACTIVE: Entry = {
  id: 'fixture-entry-morning-active',
  thread_id: 'fixture-thread-morning',
  status: 'active',
  label: 'Wed Jun 4',
  meta: {},
  created_at: '2026-06-04T07:00:00.000Z',
  closed_at: null,
};

const MORNING_JUN3: Entry = {
  id: 'fixture-entry-morning-jun3',
  thread_id: 'fixture-thread-morning',
  status: 'closed',
  label: 'Tue Jun 3',
  meta: {},
  created_at: '2026-06-03T07:00:00.000Z',
  closed_at: '2026-06-03T09:15:00.000Z',
};

const MORNING_JUN2: Entry = {
  id: 'fixture-entry-morning-jun2',
  thread_id: 'fixture-thread-morning',
  status: 'closed',
  label: 'Mon Jun 2',
  meta: {},
  created_at: '2026-06-02T07:00:00.000Z',
  closed_at: '2026-06-02T09:20:00.000Z',
};

// Evening — active only
const EVENING_ACTIVE: Entry = {
  id: 'fixture-entry-evening-active',
  thread_id: 'fixture-thread-evening',
  status: 'active',
  label: 'Wed Jun 4',
  meta: {},
  created_at: '2026-06-04T21:00:00.000Z',
  closed_at: null,
};

// Weekly — active for Jun 1–7
const WEEKLY_ACTIVE: Entry = {
  id: 'fixture-entry-weekly-active',
  thread_id: 'fixture-thread-weekly',
  status: 'active',
  label: 'Jun 1–7',
  meta: {
    total_points: 134,
    days_completed: 3,
    streak: 3,
    completion_pct: 72,
  },
  created_at: '2026-06-01T09:00:00.000Z',
  closed_at: null,
};

export const FIXTURE_ENTRIES: Entry[] = [
  MORNING_ACTIVE,
  MORNING_JUN3,
  MORNING_JUN2,
  EVENING_ACTIVE,
  WEEKLY_ACTIVE,
];

// ─── Items ────────────────────────────────────────────────────────────────────

export const FIXTURE_ITEMS: EntryItem[] = [
  // Morning active — today's checklist
  { id: 'fix-item-m-1', entry_id: 'fixture-entry-morning-active', section: null, label: 'GTD morning sweep', done: true,  points: 5,  position: 0, priority: 'high', meta: {} },
  { id: 'fix-item-m-2', entry_id: 'fixture-entry-morning-active', section: null, label: '20 min read',        done: true,  points: 5,  position: 1, meta: {} },
  { id: 'fix-item-m-3', entry_id: 'fixture-entry-morning-active', section: null, label: '3 hr deep work',    done: false, points: 10, position: 2, priority: 'high', scheduled: '09:00–12:00', meta: {} },
  { id: 'fix-item-m-4', entry_id: 'fixture-entry-morning-active', section: null, label: 'Workout',           done: false, points: 8,  position: 3, scheduled: '12:30–13:30', meta: {} },
  { id: 'fix-item-m-5', entry_id: 'fixture-entry-morning-active', section: null, label: 'Skin care',         done: true,  points: 3,  position: 4, meta: { has_chat: true } },
  { id: 'fix-item-m-6', entry_id: 'fixture-entry-morning-active', section: null, label: 'Cold shower',       done: false, points: 5,  position: 5, meta: {} },
  { id: 'fix-item-m-7', entry_id: 'fixture-entry-morning-active', section: null, label: 'Saarthi block',     done: false, points: 8,  position: 6, priority: 'high', scheduled: '14:00–17:00', meta: {} },
  { id: 'fix-item-m-8', entry_id: 'fixture-entry-morning-active', section: null, label: 'Grooming',          done: true,  points: 3,  position: 7, meta: {} },

  // Morning Jun 3 — mostly done
  { id: 'fix-item-m3-1', entry_id: 'fixture-entry-morning-jun3', section: null, label: 'GTD morning sweep', done: true,  points: 5,  position: 0, meta: {} },
  { id: 'fix-item-m3-2', entry_id: 'fixture-entry-morning-jun3', section: null, label: '20 min read',       done: true,  points: 5,  position: 1, meta: {} },
  { id: 'fix-item-m3-3', entry_id: 'fixture-entry-morning-jun3', section: null, label: '3 hr deep work',   done: true,  points: 10, position: 2, meta: {} },
  { id: 'fix-item-m3-4', entry_id: 'fixture-entry-morning-jun3', section: null, label: 'Workout',          done: false, points: 8,  position: 3, meta: {} },
  { id: 'fix-item-m3-5', entry_id: 'fixture-entry-morning-jun3', section: null, label: 'Skin care',        done: true,  points: 3,  position: 4, meta: {} },
  { id: 'fix-item-m3-6', entry_id: 'fixture-entry-morning-jun3', section: null, label: 'Cold shower',      done: true,  points: 5,  position: 5, meta: {} },

  // Morning Jun 2 — partial
  { id: 'fix-item-m2-1', entry_id: 'fixture-entry-morning-jun2', section: null, label: 'GTD morning sweep', done: true,  points: 5,  position: 0, meta: {} },
  { id: 'fix-item-m2-2', entry_id: 'fixture-entry-morning-jun2', section: null, label: '20 min read',       done: false, points: 5,  position: 1, meta: {} },
  { id: 'fix-item-m2-3', entry_id: 'fixture-entry-morning-jun2', section: null, label: '3 hr deep work',   done: true,  points: 10, position: 2, meta: {} },
  { id: 'fix-item-m2-4', entry_id: 'fixture-entry-morning-jun2', section: null, label: 'Workout',          done: true,  points: 8,  position: 3, meta: {} },

  // Evening active — reflection prompts
  { id: 'fix-item-e-1', entry_id: 'fixture-entry-evening-active', section: null, label: '3 wins from today',             done: false, points: 0, position: 0, meta: { has_chat: true } },
  { id: 'fix-item-e-2', entry_id: 'fixture-entry-evening-active', section: null, label: 'Where did I get pulled off course?', done: false, points: 0, position: 1, meta: { has_chat: true } },
  { id: 'fix-item-e-3', entry_id: 'fixture-entry-evening-active', section: null, label: 'One thing for tomorrow',         done: false, points: 0, position: 2, meta: { has_chat: true } },
  { id: 'fix-item-e-4', entry_id: 'fixture-entry-evening-active', section: null, label: 'Energy check-in',               done: false, points: 0, position: 3, meta: { has_chat: true } },

  // Weekly active — review + plan sections
  { id: 'fix-item-w-r1', entry_id: 'fixture-entry-weekly-active', section: 'review', label: 'Deep work days this week',     done: true,  points: 0, position: 0, meta: {} },
  { id: 'fix-item-w-r2', entry_id: 'fixture-entry-weekly-active', section: 'review', label: 'Workout consistency (3/5)',    done: true,  points: 0, position: 1, meta: {} },
  { id: 'fix-item-w-r3', entry_id: 'fixture-entry-weekly-active', section: 'review', label: 'Biggest drag this week',      done: false, points: 0, position: 2, meta: { has_chat: true } },
  { id: 'fix-item-w-p1', entry_id: 'fixture-entry-weekly-active', section: 'plan', label: 'Ship threads data layer (A)',   done: false, points: 8,  position: 0, priority: 'high', meta: {} },
  { id: 'fix-item-w-p2', entry_id: 'fixture-entry-weekly-active', section: 'plan', label: 'Ship Summary UIs (B)',          done: false, points: 8,  position: 1, priority: 'high', meta: {} },
  { id: 'fix-item-w-p3', entry_id: 'fixture-entry-weekly-active', section: 'plan', label: 'Ship Chat + Coach pane (C)',    done: false, points: 8,  position: 2, priority: 'high', meta: {} },
  { id: 'fix-item-w-p4', entry_id: 'fixture-entry-weekly-active', section: 'plan', label: 'Publish LinkedIn post',         done: false, points: 3,  position: 3, meta: {} },
];

// ─── Messages ─────────────────────────────────────────────────────────────────

export const FIXTURE_MESSAGES: EntryMessage[] = [
  // Morning active — AI greeting + nudge
  {
    id: 'fix-msg-m-1',
    entry_id: 'fixture-entry-morning-active',
    role: 'ai',
    text: 'Good morning ✦ You\'re 3 of 8 done — GTD sweep, reading, and grooming already in. Deep work block starts in 40 minutes. Cold shower and workout are the ones to nail today to keep the streak.',
    item_ref: null,
    meta: { suggests: true },
    created_at: '2026-06-04T07:02:00.000Z',
  },
  {
    id: 'fix-msg-m-2',
    entry_id: 'fixture-entry-morning-active',
    role: 'user',
    text: 'Skip cold shower today — gym later',
    item_ref: null,
    meta: {},
    created_at: '2026-06-04T07:03:30.000Z',
  },
  {
    id: 'fix-msg-m-3',
    entry_id: 'fixture-entry-morning-active',
    role: 'ai',
    text: 'Got it — pulling cold shower. Workout stays; you can still earn that 8 points at the gym.',
    item_ref: 'fix-item-m-6',
    meta: {},
    created_at: '2026-06-04T07:03:45.000Z',
  },

  // Morning Jun 3 — closed session
  {
    id: 'fix-msg-m3-1',
    entry_id: 'fixture-entry-morning-jun3',
    role: 'ai',
    text: 'Good morning ✦ Tuesday. 6 items queued, 46 points on the table. You closed yesterday strong — let\'s match it.',
    item_ref: null,
    meta: {},
    created_at: '2026-06-03T07:01:00.000Z',
  },
  {
    id: 'fix-msg-m3-2',
    entry_id: 'fixture-entry-morning-jun3',
    role: 'user',
    text: 'Yes, skipping workout today — traveling',
    item_ref: null,
    meta: {},
    created_at: '2026-06-03T07:02:00.000Z',
  },
  {
    id: 'fix-msg-m3-3',
    entry_id: 'fixture-entry-morning-jun3',
    role: 'ai',
    text: 'Noted — workout marked as skipped. You\'re still at 5 of 6 completable items. Solid day.',
    item_ref: 'fix-item-m3-4',
    meta: {},
    created_at: '2026-06-03T07:02:15.000Z',
  },

  // Morning Jun 2 — closed session
  {
    id: 'fix-msg-m2-1',
    entry_id: 'fixture-entry-morning-jun2',
    role: 'ai',
    text: 'Good morning ✦ Monday — fresh week. GTD sweep first, then let\'s get you into deep work by 9.',
    item_ref: null,
    meta: {},
    created_at: '2026-06-02T07:00:00.000Z',
  },
  {
    id: 'fix-msg-m2-2',
    entry_id: 'fixture-entry-morning-jun2',
    role: 'user',
    text: 'Done with GTD and deep work. Skipped reading — low energy.',
    item_ref: null,
    meta: {},
    created_at: '2026-06-02T14:30:00.000Z',
  },

  // Evening active — AI opens
  {
    id: 'fix-msg-e-1',
    entry_id: 'fixture-entry-evening-active',
    role: 'ai',
    text: 'Evening ✦ Let\'s wind down and reflect. Four prompts tonight — take your time with each.',
    item_ref: null,
    meta: {},
    created_at: '2026-06-04T21:00:00.000Z',
  },

  // Weekly active — AI opens
  {
    id: 'fix-msg-w-1',
    entry_id: 'fixture-entry-weekly-active',
    role: 'ai',
    text: 'Weekly ritual — Jun 1–7 ✦ 3 days completed, 134 points, 72% completion rate. Strong start. Review section shows 3/5 workout days. What dragged this week?',
    item_ref: 'fix-item-w-r3',
    meta: {},
    created_at: '2026-06-01T09:01:00.000Z',
  },
];

// ─── Grouped lookups (used by hooks and B/C components) ───────────────────────

export function getFixtureThread(threadId: string): Thread | undefined {
  return FIXTURE_THREADS.find((t) => t.id === threadId);
}

export function getFixtureEntriesForThread(threadId: string): Entry[] {
  return FIXTURE_ENTRIES.filter((e) => e.thread_id === threadId).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function getFixtureItemsForEntry(entryId: string): EntryItem[] {
  return FIXTURE_ITEMS.filter((i) => i.entry_id === entryId).sort(
    (a, b) => a.position - b.position,
  );
}

export function getFixtureMessagesForEntry(entryId: string): EntryMessage[] {
  return FIXTURE_MESSAGES.filter((m) => m.entry_id === entryId).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}
