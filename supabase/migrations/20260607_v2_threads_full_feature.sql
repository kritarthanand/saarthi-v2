-- W1: Threads Full Feature Migration
-- Alter v2_threads (enum → text, add columns, replace index),
-- create v2_tasks, create v2_thread_messages.
-- v2_thread_entries, v2_entry_items, v2_entry_messages, v2_ritual_template_items
-- are deprecated but NOT dropped here (future cleanup migration).

-- ============================================================
-- §2.1  v2_threads — alter existing table
-- ============================================================

-- Step 1: Drop default values that reference the enum types before casting.
ALTER TABLE v2_threads ALTER COLUMN template DROP DEFAULT;

-- Step 2: Cast enum columns to plain text (detaches them from the enum types).
ALTER TABLE v2_threads
  ALTER COLUMN template TYPE text USING template::text,
  ALTER COLUMN coach_id TYPE text USING coach_id::text;

-- Step 3: Drop the enum types now that no columns reference them.
DROP TYPE IF EXISTS v2_thread_template;
DROP TYPE IF EXISTS v2_coach_id;

-- Step 4: Add new columns.
ALTER TABLE v2_threads
  ADD COLUMN IF NOT EXISTS period_key   text,           -- '2026-06-07' | '2026-W23' | NULL
  ADD COLUMN IF NOT EXISTS archived_at  timestamptz,    -- soft-delete
  ADD COLUMN IF NOT EXISTS meta         jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Step 5: Replace the old unique index.
DROP INDEX IF EXISTS v2_threads_user_template_idx;

-- Partial unique index: for ritual threads (period_key IS NOT NULL),
-- enforce one row per (user, template, period).
-- Freeform threads (period_key IS NULL) are excluded — they may be many.
CREATE UNIQUE INDEX v2_threads_ritual_uniq
  ON v2_threads (user_id, template, period_key)
  WHERE period_key IS NOT NULL;

-- ============================================================
-- §2.2  v2_tasks — new table
-- ============================================================

CREATE TABLE v2_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     uuid NOT NULL REFERENCES v2_threads(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','done','dropped')),
  priority      text NOT NULL DEFAULT 'med'
                  CHECK (priority IN ('high','med','low')),
  points        int NOT NULL DEFAULT 0,
  section       text,                     -- optional group within thread (e.g. 'review'/'plan')
  scheduled_for date,                     -- YYYY-MM-DD, the day the user intends to work on it
  due_at        timestamptz,              -- hard deadline
  position      int NOT NULL DEFAULT 0,  -- display order within section
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX v2_tasks_thread_idx ON v2_tasks (thread_id, section, position);
CREATE INDEX v2_tasks_user_idx   ON v2_tasks (user_id, status);

-- Auto-update updated_at on every row change.
CREATE OR REPLACE FUNCTION v2_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER v2_tasks_touch BEFORE UPDATE ON v2_tasks
  FOR EACH ROW EXECUTE FUNCTION v2_touch_updated_at();

ALTER TABLE v2_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_tasks_rls ON v2_tasks
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- §2.3  v2_thread_messages — new table
-- ============================================================

CREATE TABLE v2_thread_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid NOT NULL REFERENCES v2_threads(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('user','ai','system','tool')),
  content    text NOT NULL,
  task_ref   uuid REFERENCES v2_tasks(id) ON DELETE SET NULL,
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX v2_thread_messages_thread_idx ON v2_thread_messages (thread_id, created_at);

ALTER TABLE v2_thread_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY v2_thread_messages_rls ON v2_thread_messages
  USING (
    EXISTS (
      SELECT 1 FROM v2_threads t
      WHERE t.id = v2_thread_messages.thread_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM v2_threads t
      WHERE t.id = v2_thread_messages.thread_id
        AND t.user_id = auth.uid()
    )
  );
