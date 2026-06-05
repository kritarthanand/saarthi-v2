-- V2 recurring-conversation threads.
-- Replaces the earlier freeform-thread draft (same file, never applied).
-- All tables prefixed `v2_` — this project shares a Supabase instance with V1.

-- ── enums ───────────────────────────────────────────────────────────────────

create type v2_thread_template as enum (
  'morning_ritual',
  'evening_ritual',
  'weekly_ritual'
);

-- Pandava coach ids — matches CoachId in src/constants/pandavas.ts.
-- Swap for FK to v2_coaches when that table lands.
create type v2_coach_id as enum (
  'nakula', 'bheem', 'arjun', 'yudi', 'sahdev'
);

-- ── v2_threads ───────────────────────────────────────────────────────────────
-- The recurring conversation itself — one per template per user.

create table v2_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  template    v2_thread_template not null,
  coach_id    v2_coach_id not null,
  tag         text not null,
  title       text,
  created_at  timestamptz default now()
);

-- One thread per template per user.
create unique index v2_threads_user_template_idx
  on v2_threads (user_id, template);

-- Fast lookup of all threads owned by a coach (used by the Coach pane).
create index v2_threads_user_coach_idx
  on v2_threads (user_id, coach_id);

alter table v2_threads enable row level security;

create policy v2_threads_user_rls on v2_threads
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── v2_thread_entries ────────────────────────────────────────────────────────
-- One instance of a recurring conversation (a single morning, a single week).

create table v2_thread_entries (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references v2_threads on delete cascade,
  status      text not null default 'active',  -- 'active' | 'closed'
  label       text,                            -- 'Wed Jun 4', 'Jun 1–7'
  meta        jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  closed_at   timestamptz
);

-- At most one active entry per thread — enforced by partial unique index.
create unique index v2_thread_entries_one_active_idx
  on v2_thread_entries (thread_id) where status = 'active';

alter table v2_thread_entries enable row level security;

create policy v2_thread_entries_user_rls on v2_thread_entries
  using (
    exists (
      select 1 from v2_threads t
      where t.id = v2_thread_entries.thread_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from v2_threads t
      where t.id = v2_thread_entries.thread_id
        and t.user_id = auth.uid()
    )
  );

-- ── v2_entry_items ───────────────────────────────────────────────────────────
-- Checklist rows, reflection prompts, etc. belonging to one entry.

create table v2_entry_items (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references v2_thread_entries on delete cascade,
  section     text,           -- weekly: 'review' | 'plan'; daily templates: null
  label       text not null,
  done        boolean default false,
  points      int default 0,
  position    int default 0,
  priority    text,           -- 'high' | 'med' | 'low'
  scheduled   text,           -- free-form hint e.g. '09:00–12:00'
  meta        jsonb default '{}'::jsonb
);

create index on v2_entry_items (entry_id, position);

alter table v2_entry_items enable row level security;

create policy v2_entry_items_user_rls on v2_entry_items
  using (
    exists (
      select 1
        from v2_thread_entries e
        join v2_threads t on t.id = e.thread_id
       where e.id = v2_entry_items.entry_id
         and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from v2_thread_entries e
        join v2_threads t on t.id = e.thread_id
       where e.id = v2_entry_items.entry_id
         and t.user_id = auth.uid()
    )
  );

-- ── v2_entry_messages ────────────────────────────────────────────────────────
-- Chat messages within one entry.

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

alter table v2_entry_messages enable row level security;

create policy v2_entry_messages_user_rls on v2_entry_messages
  using (
    exists (
      select 1
        from v2_thread_entries e
        join v2_threads t on t.id = e.thread_id
       where e.id = v2_entry_messages.entry_id
         and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from v2_thread_entries e
        join v2_threads t on t.id = e.thread_id
       where e.id = v2_entry_messages.entry_id
         and t.user_id = auth.uid()
    )
  );
