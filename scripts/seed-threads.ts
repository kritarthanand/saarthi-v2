/**
 * Seed the dev user's threads, entries, items, and messages in Supabase.
 * Mirrors src/lib/threads.fixture.ts against the real DB. Idempotent — wipes
 * any existing v2 thread data for the dev user before reinserting.
 *
 * Run with:
 *   npx tsx --env-file=server/.env scripts/seed-threads.ts
 *
 * Requires in server/.env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY   (service role — bypasses RLS)
 *   SAARTHI_DEV_USER_ID    (uuid of the dev auth.users row)
 */

import { createClient } from '@supabase/supabase-js';
import type { ThreadTemplate } from '../src/lib/threads';

// String constants matching the ThreadTemplate type values
const T = {
  MorningRitual: 'morning_ritual' as ThreadTemplate,
  EveningRitual: 'evening_ritual' as ThreadTemplate,
  WeeklyRitual:  'weekly_ritual'  as ThreadTemplate,
} as const;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DEV_USER_ID = process.env.SAARTHI_DEV_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DEV_USER_ID) {
  console.error(
    'Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, SAARTHI_DEV_USER_ID\n' +
    'Set them in server/.env.',
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Fixture data ──────────────────────────────────────────────────────────────

const THREADS = [
  { template: T.MorningRitual, coach_id: 'sahdev', tag: '#MorningRitual', title: 'Morning Ritual' },
  { template: T.EveningRitual, coach_id: 'sahdev', tag: '#EveningRitual', title: 'Evening Ritual' },
  { template: T.WeeklyRitual,  coach_id: 'sahdev', tag: '#WeeklyRitual',  title: 'Weekly Ritual'  },
];

type EntrySpec = {
  template: ThreadTemplate;
  status: 'active' | 'closed';
  label: string;
  meta?: Record<string, unknown>;
  created_at: string;
  closed_at?: string;
  items: ItemSpec[];
  messages: MessageSpec[];
};

type ItemSpec = {
  section?: string;
  label: string;
  done: boolean;
  points: number;
  position: number;
  priority?: string;
  scheduled?: string;
  meta?: Record<string, unknown>;
};

type MessageSpec = {
  role: 'ai' | 'user';
  text: string;
  item_position?: number;
  meta?: Record<string, unknown>;
  created_at: string;
};

const ENTRIES: EntrySpec[] = [
  // ── Morning ──────────────────────────────────────────────────────────────
  {
    template: T.MorningRitual,
    status: 'active',
    label: 'Wed Jun 4',
    created_at: '2026-06-04T07:00:00Z',
    items: [
      { label: 'GTD morning sweep', done: true,  points: 5,  position: 0, priority: 'high', meta: {} },
      { label: '20 min read',       done: true,  points: 5,  position: 1, meta: {} },
      { label: '3 hr deep work',    done: false, points: 10, position: 2, priority: 'high', scheduled: '09:00–12:00', meta: {} },
      { label: 'Workout',           done: false, points: 8,  position: 3, scheduled: '12:30–13:30', meta: {} },
      { label: 'Skin care',         done: true,  points: 3,  position: 4, meta: { has_chat: true } },
      { label: 'Cold shower',       done: false, points: 5,  position: 5, meta: {} },
      { label: 'Saarthi block',     done: false, points: 8,  position: 6, priority: 'high', scheduled: '14:00–17:00', meta: {} },
      { label: 'Grooming',          done: true,  points: 3,  position: 7, meta: {} },
    ],
    messages: [
      { role: 'ai',   text: 'Good morning ✦ You\'re 3 of 8 done — GTD sweep, reading, and grooming already in. Deep work block starts in 40 minutes. Cold shower and workout are the ones to nail today to keep the streak.', created_at: '2026-06-04T07:02:00Z', meta: { suggests: true } },
      { role: 'user', text: 'Skip cold shower today — gym later', created_at: '2026-06-04T07:03:30Z', meta: {} },
      { role: 'ai',   text: 'Got it — pulling cold shower. Workout stays; you can still earn that 8 points at the gym.', created_at: '2026-06-04T07:03:45Z', meta: {} },
    ],
  },
  {
    template: T.MorningRitual,
    status: 'closed',
    label: 'Tue Jun 3',
    created_at: '2026-06-03T07:00:00Z',
    closed_at: '2026-06-03T09:15:00Z',
    items: [
      { label: 'GTD morning sweep', done: true,  points: 5,  position: 0, meta: {} },
      { label: '20 min read',       done: true,  points: 5,  position: 1, meta: {} },
      { label: '3 hr deep work',    done: true,  points: 10, position: 2, meta: {} },
      { label: 'Workout',           done: false, points: 8,  position: 3, meta: {} },
      { label: 'Skin care',         done: true,  points: 3,  position: 4, meta: {} },
      { label: 'Cold shower',       done: true,  points: 5,  position: 5, meta: {} },
    ],
    messages: [
      { role: 'ai',   text: 'Good morning ✦ Tuesday. 6 items queued, 46 points on the table. You closed yesterday strong — let\'s match it.', created_at: '2026-06-03T07:01:00Z', meta: {} },
      { role: 'user', text: 'Yes, skipping workout today — traveling', created_at: '2026-06-03T07:02:00Z', meta: {} },
      { role: 'ai',   text: 'Noted — workout marked as skipped. You\'re still at 5 of 6 completable items. Solid day.', created_at: '2026-06-03T07:02:15Z', meta: {} },
    ],
  },
  {
    template: T.MorningRitual,
    status: 'closed',
    label: 'Mon Jun 2',
    created_at: '2026-06-02T07:00:00Z',
    closed_at: '2026-06-02T09:20:00Z',
    items: [
      { label: 'GTD morning sweep', done: true,  points: 5,  position: 0, meta: {} },
      { label: '20 min read',       done: false, points: 5,  position: 1, meta: {} },
      { label: '3 hr deep work',    done: true,  points: 10, position: 2, meta: {} },
      { label: 'Workout',           done: true,  points: 8,  position: 3, meta: {} },
    ],
    messages: [
      { role: 'ai',   text: 'Good morning ✦ Monday — fresh week. GTD sweep first, then let\'s get you into deep work by 9.', created_at: '2026-06-02T07:00:00Z', meta: {} },
      { role: 'user', text: 'Done with GTD and deep work. Skipped reading — low energy.', created_at: '2026-06-02T14:30:00Z', meta: {} },
    ],
  },

  // ── Evening ───────────────────────────────────────────────────────────────
  {
    template: T.EveningRitual,
    status: 'active',
    label: 'Wed Jun 4',
    created_at: '2026-06-04T21:00:00Z',
    items: [
      { label: '3 wins from today',             done: false, points: 0, position: 0, meta: { has_chat: true } },
      { label: 'Where did I get pulled off course?', done: false, points: 0, position: 1, meta: { has_chat: true } },
      { label: 'One thing for tomorrow',         done: false, points: 0, position: 2, meta: { has_chat: true } },
      { label: 'Energy check-in',               done: false, points: 0, position: 3, meta: { has_chat: true } },
    ],
    messages: [
      { role: 'ai', text: 'Evening ✦ Let\'s wind down and reflect. Four prompts tonight — take your time with each.', created_at: '2026-06-04T21:00:00Z', meta: {} },
    ],
  },

  // ── Weekly ────────────────────────────────────────────────────────────────
  {
    template: T.WeeklyRitual,
    status: 'active',
    label: 'Jun 1–7',
    meta: { total_points: 134, days_completed: 3, streak: 3, completion_pct: 72 },
    created_at: '2026-06-01T09:00:00Z',
    items: [
      { section: 'review', label: 'Deep work days this week',   done: true,  points: 0, position: 0, meta: {} },
      { section: 'review', label: 'Workout consistency (3/5)',  done: true,  points: 0, position: 1, meta: {} },
      { section: 'review', label: 'Biggest drag this week',     done: false, points: 0, position: 2, meta: { has_chat: true } },
      { section: 'plan',   label: 'Ship threads data layer (A)', done: false, points: 8, position: 0, priority: 'high', meta: {} },
      { section: 'plan',   label: 'Ship Summary UIs (B)',        done: false, points: 8, position: 1, priority: 'high', meta: {} },
      { section: 'plan',   label: 'Ship Chat + Coach pane (C)',  done: false, points: 8, position: 2, priority: 'high', meta: {} },
      { section: 'plan',   label: 'Publish LinkedIn post',       done: false, points: 3, position: 3, meta: {} },
    ],
    messages: [
      { role: 'ai', text: 'Weekly ritual — Jun 1–7 ✦ 3 days completed, 134 points, 72% completion rate. Strong start. Review section shows 3/5 workout days. What dragged this week?', created_at: '2026-06-01T09:01:00Z', meta: {} },
    ],
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding threads for user ${DEV_USER_ID}…`);

  // Delete existing threads (cascades to entries → items, messages)
  const { error: delErr } = await db
    .from('v2_threads')
    .delete()
    .eq('user_id', DEV_USER_ID);
  if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
  console.log('  Cleared existing data.');

  // Insert threads
  const { data: threadRows, error: thrErr } = await db
    .from('v2_threads')
    .insert(THREADS.map((t) => ({ ...t, user_id: DEV_USER_ID })))
    .select();
  if (thrErr) throw new Error(`Thread insert failed: ${thrErr.message}`);

  const threadByTemplate = Object.fromEntries(
    (threadRows ?? []).map((r: { id: string; template: string }) => [r.template, r.id]),
  );

  for (const spec of ENTRIES) {
    const threadId = threadByTemplate[spec.template];
    if (!threadId) throw new Error(`No thread for template ${spec.template}`);

    // Insert entry
    const { data: entryRows, error: entErr } = await db
      .from('v2_thread_entries')
      .insert({
        thread_id: threadId,
        status: spec.status,
        label: spec.label,
        meta: spec.meta ?? {},
        created_at: spec.created_at,
        closed_at: spec.closed_at ?? null,
      })
      .select();
    if (entErr) throw new Error(`Entry insert failed (${spec.label}): ${entErr.message}`);

    const entryId = entryRows?.[0]?.id;
    if (!entryId) throw new Error(`Entry insert for "${spec.label}" returned no rows`);

    // Insert items
    if (spec.items.length) {
      const { error: itemErr } = await db
        .from('v2_entry_items')
        .insert(spec.items.map((it) => ({ ...it, entry_id: entryId })));
      if (itemErr) throw new Error(`Item insert failed (${spec.label}): ${itemErr.message}`);
    }

    // Insert messages
    if (spec.messages.length) {
      const { error: msgErr } = await db
        .from('v2_entry_messages')
        .insert(
          spec.messages.map(({ item_position: _ip, ...msg }) => ({
            ...msg,
            entry_id: entryId,
          })),
        );
      if (msgErr) throw new Error(`Message insert failed (${spec.label}): ${msgErr.message}`);
    }

    console.log(`  ✓ ${spec.label} [${spec.template}] — ${spec.items.length} items, ${spec.messages.length} messages`);
  }

  console.log('Done.');
}

seed().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
