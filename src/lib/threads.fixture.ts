import type { Task, Thread, ThreadMessage } from './threads';

// ── Threads ───────────────────────────────────────────────────────────────────

export const FIXTURE_MORNING_THREAD: Thread = {
  id: 'fx-morning',
  user_id: 'dev-user',
  template: 'morning_ritual',
  coach_id: 'sahdev',
  tag: '#MorningRitual',
  title: 'Morning Ritual',
  period_key: '2026-06-04',
  archived_at: null,
  meta: { streak: 12 },
  created_at: '2026-06-04T06:45:00Z',
  task_count: 8,
  done_count: 3,
  points_earned: 14,
  points_total: 47,
  last_message_at: null,
  last_message_preview: null,
  system_prompt: null,
  chat_model: null,
};

export const FIXTURE_EVENING_THREAD: Thread = {
  id: 'fx-evening',
  user_id: 'dev-user',
  template: 'evening_ritual',
  coach_id: 'sahdev',
  tag: '#EveningRitual',
  title: 'Evening Ritual',
  period_key: '2026-06-04',
  archived_at: null,
  meta: {},
  created_at: '2026-06-04T21:00:00Z',
  task_count: 5,
  done_count: 0,
  points_earned: 0,
  points_total: 0,
  last_message_at: null,
  last_message_preview: null,
  system_prompt: null,
  chat_model: null,
};

export const FIXTURE_WEEKLY_THREAD: Thread = {
  id: 'fx-weekly',
  user_id: 'dev-user',
  template: 'weekly_ritual',
  coach_id: 'sahdev',
  tag: '#WeeklyRitual',
  title: 'Weekly Ritual',
  period_key: '2026-W23',
  archived_at: null,
  meta: { completion_pct: 73, points_total: 284, streak: 5 },
  created_at: '2026-06-01T10:00:00Z',
  task_count: 9,
  done_count: 3,
  points_earned: 15,
  points_total: 45,
  last_message_at: null,
  last_message_preview: null,
  system_prompt: null,
  chat_model: null,
};

export const FIXTURE_THREADS: Thread[] = [
  FIXTURE_MORNING_THREAD,
  FIXTURE_EVENING_THREAD,
  FIXTURE_WEEKLY_THREAD,
];

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const FIXTURE_MORNING_TASKS: Task[] = [
  { id: 'fmt-1', thread_id: 'fx-morning', user_id: 'dev-user', title: 'Cold shower',          status: 'done',  priority: 'med', points: 6,  section: null, scheduled_for: null, due_at: null, position: 0, meta: {},               created_at: '2026-06-04T06:45:00Z', updated_at: '2026-06-04T07:10:00Z' },
  { id: 'fmt-2', thread_id: 'fx-morning', user_id: 'dev-user', title: 'Meditation (10 min)',  status: 'done',  priority: 'med', points: 8,  section: null, scheduled_for: null, due_at: null, position: 1, meta: {},               created_at: '2026-06-04T06:45:00Z', updated_at: '2026-06-04T07:20:00Z' },
  { id: 'fmt-3', thread_id: 'fx-morning', user_id: 'dev-user', title: 'Journaling',           status: 'open',  priority: 'med', points: 5,  section: null, scheduled_for: null, due_at: null, position: 2, meta: { has_chat: true }, created_at: '2026-06-04T06:45:00Z', updated_at: '2026-06-04T06:45:00Z' },
  { id: 'fmt-4', thread_id: 'fx-morning', user_id: 'dev-user', title: 'Plan top 3 priorities',status: 'open',  priority: 'high',points: 7,  section: null, scheduled_for: null, due_at: null, position: 3, meta: { has_chat: true }, created_at: '2026-06-04T06:45:00Z', updated_at: '2026-06-04T06:45:00Z' },
  { id: 'fmt-5', thread_id: 'fx-morning', user_id: 'dev-user', title: 'Workout',              status: 'open',  priority: 'high',points: 10, section: null, scheduled_for: '2026-06-04', due_at: null, position: 4, meta: {},   created_at: '2026-06-04T06:45:00Z', updated_at: '2026-06-04T06:45:00Z' },
  { id: 'fmt-6', thread_id: 'fx-morning', user_id: 'dev-user', title: 'Read (20 min)',        status: 'open',  priority: 'med', points: 5,  section: null, scheduled_for: null, due_at: null, position: 5, meta: {},               created_at: '2026-06-04T06:45:00Z', updated_at: '2026-06-04T06:45:00Z' },
  { id: 'fmt-7', thread_id: 'fx-morning', user_id: 'dev-user', title: 'Vitamins',             status: 'done',  priority: 'low', points: 3,  section: null, scheduled_for: null, due_at: null, position: 6, meta: {},               created_at: '2026-06-04T06:45:00Z', updated_at: '2026-06-04T07:00:00Z' },
  { id: 'fmt-8', thread_id: 'fx-morning', user_id: 'dev-user', title: 'Review calendar',     status: 'open',  priority: 'low', points: 2,  section: null, scheduled_for: null, due_at: null, position: 7, meta: {},               created_at: '2026-06-04T06:45:00Z', updated_at: '2026-06-04T06:45:00Z' },
];

export const FIXTURE_EVENING_TASKS: Task[] = [
  { id: 'fet-1', thread_id: 'fx-evening', user_id: 'dev-user', title: '1–3 wins from today',              status: 'open', priority: 'med', points: 0, section: null, scheduled_for: null, due_at: null, position: 0, meta: {}, created_at: '2026-06-04T21:00:00Z', updated_at: '2026-06-04T21:00:00Z' },
  { id: 'fet-2', thread_id: 'fx-evening', user_id: 'dev-user', title: 'Where I got pulled off course',    status: 'open', priority: 'med', points: 0, section: null, scheduled_for: null, due_at: null, position: 1, meta: {}, created_at: '2026-06-04T21:00:00Z', updated_at: '2026-06-04T21:00:00Z' },
  { id: 'fet-3', thread_id: 'fx-evening', user_id: 'dev-user', title: 'One thing for tomorrow',          status: 'open', priority: 'med', points: 0, section: null, scheduled_for: null, due_at: null, position: 2, meta: {}, created_at: '2026-06-04T21:00:00Z', updated_at: '2026-06-04T21:00:00Z' },
  { id: 'fet-4', thread_id: 'fx-evening', user_id: 'dev-user', title: 'Energy level (1–10)',             status: 'open', priority: 'low', points: 0, section: null, scheduled_for: null, due_at: null, position: 3, meta: {}, created_at: '2026-06-04T21:00:00Z', updated_at: '2026-06-04T21:00:00Z' },
  { id: 'fet-5', thread_id: 'fx-evening', user_id: 'dev-user', title: 'Gratitude: one moment',           status: 'open', priority: 'low', points: 0, section: null, scheduled_for: null, due_at: null, position: 4, meta: {}, created_at: '2026-06-04T21:00:00Z', updated_at: '2026-06-04T21:00:00Z' },
];

export const FIXTURE_WEEKLY_TASKS: Task[] = [
  // Review section
  { id: 'fwt-r1', thread_id: 'fx-weekly', user_id: 'dev-user', title: 'What worked this week',       status: 'open',  priority: 'med', points: 0, section: 'review', scheduled_for: null, due_at: null, position: 0, meta: {}, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
  { id: 'fwt-r2', thread_id: 'fx-weekly', user_id: 'dev-user', title: 'What slowed me down',         status: 'open',  priority: 'med', points: 0, section: 'review', scheduled_for: null, due_at: null, position: 1, meta: {}, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
  { id: 'fwt-r3', thread_id: 'fx-weekly', user_id: 'dev-user', title: 'One pattern to change',       status: 'open',  priority: 'med', points: 0, section: 'review', scheduled_for: null, due_at: null, position: 2, meta: {}, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
  { id: 'fwt-r4', thread_id: 'fx-weekly', user_id: 'dev-user', title: 'Biggest win of the week',     status: 'done',  priority: 'med', points: 0, section: 'review', scheduled_for: null, due_at: null, position: 3, meta: {}, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-04T10:00:00Z' },
  // Plan section
  { id: 'fwt-p1', thread_id: 'fx-weekly', user_id: 'dev-user', title: 'Top 3 priorities for next week', status: 'open', priority: 'high', points: 0, section: 'plan', scheduled_for: null, due_at: null, position: 0, meta: {}, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
  { id: 'fwt-p2', thread_id: 'fx-weekly', user_id: 'dev-user', title: 'One commitment to protect',     status: 'open', priority: 'med',  points: 0, section: 'plan', scheduled_for: null, due_at: null, position: 1, meta: {}, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
  { id: 'fwt-p3', thread_id: 'fx-weekly', user_id: 'dev-user', title: 'One thing to say no to',        status: 'done', priority: 'med',  points: 0, section: 'plan', scheduled_for: null, due_at: null, position: 2, meta: {}, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-04T10:00:00Z' },
  { id: 'fwt-p4', thread_id: 'fx-weekly', user_id: 'dev-user', title: 'Stretch goal',                  status: 'open', priority: 'low',  points: 0, section: 'plan', scheduled_for: null, due_at: null, position: 3, meta: {}, created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
];

// ── Messages ──────────────────────────────────────────────────────────────────

export const FIXTURE_MORNING_MESSAGES: ThreadMessage[] = [
  {
    id: 'fmm-1',
    thread_id: 'fx-morning',
    role: 'ai',
    content: '"Plan top 3 priorities" — want me to pull them from your Focus thread?',
    task_ref: 'fmt-4',
    meta: { suggests: true, chip_labels: ['yes, pull them', "I'll do it manually", 'remind me at 9'] },
    created_at: '2026-06-04T06:50:00Z',
  },
];

export const FIXTURE_EVENING_MESSAGES: ThreadMessage[] = [];
export const FIXTURE_WEEKLY_MESSAGES: ThreadMessage[] = [];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export type FixtureBundle = {
  thread: Thread;
  tasks: Task[];
  messages: ThreadMessage[];
};

const BUNDLE_BY_TAG: Record<string, FixtureBundle> = {
  '#MorningRitual': {
    thread: FIXTURE_MORNING_THREAD,
    tasks: FIXTURE_MORNING_TASKS,
    messages: FIXTURE_MORNING_MESSAGES,
  },
  '#EveningRitual': {
    thread: FIXTURE_EVENING_THREAD,
    tasks: FIXTURE_EVENING_TASKS,
    messages: FIXTURE_EVENING_MESSAGES,
  },
  '#WeeklyRitual': {
    thread: FIXTURE_WEEKLY_THREAD,
    tasks: FIXTURE_WEEKLY_TASKS,
    messages: FIXTURE_WEEKLY_MESSAGES,
  },
};

export function getFixtureBundle(tag: string): FixtureBundle | null {
  return BUNDLE_BY_TAG[tag] ?? null;
}

// Flat aggregates
export const FIXTURE_TASKS: Task[] = [
  ...FIXTURE_MORNING_TASKS,
  ...FIXTURE_EVENING_TASKS,
  ...FIXTURE_WEEKLY_TASKS,
];

export const FIXTURE_MESSAGES: ThreadMessage[] = [
  ...FIXTURE_MORNING_MESSAGES,
  ...FIXTURE_EVENING_MESSAGES,
  ...FIXTURE_WEEKLY_MESSAGES,
];
