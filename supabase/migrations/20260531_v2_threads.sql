-- V2 threads — freeform, user-created conversation spaces.
-- Prefixed with `v2_` to avoid colliding with V1's `threads` table
-- (which uses a sadhana/template model) in the shared Supabase project.
-- NOT APPLIED YET — review before pushing.

-- ── v2_threads ──────────────────────────────────────────────────────────────

CREATE TABLE v2_threads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title        text NOT NULL,
  -- Optional emoji/icon shown in the thread list, e.g. "🧠" or "fitness".
  icon         text,
  -- Free-form summary the model can rewrite as the thread evolves.
  summary      text,
  -- Pinned threads sort to the top of the list.
  pinned       boolean NOT NULL DEFAULT false,
  -- archived threads stay in the DB but are hidden from the default list.
  archived_at  timestamptz,
  -- Last user/assistant message timestamp — drives list ordering.
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX v2_threads_user_last_msg_idx
  ON v2_threads (user_id, last_message_at DESC)
  WHERE archived_at IS NULL;

ALTER TABLE v2_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY v2_threads_user_rls ON v2_threads
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── v2_thread_messages ──────────────────────────────────────────────────────

CREATE TABLE v2_thread_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid NOT NULL REFERENCES v2_threads ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content    text NOT NULL,
  -- Free-form metadata: tool name, audio refs, model used, etc.
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX v2_thread_messages_thread_created_idx
  ON v2_thread_messages (thread_id, created_at);

ALTER TABLE v2_thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY v2_thread_messages_user_rls ON v2_thread_messages
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

-- ── updated_at trigger ──────────────────────────────────────────────────────
-- V1 already defined set_updated_at(); reuse if present, otherwise create.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER v2_threads_set_updated_at
  BEFORE UPDATE ON v2_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── last_message_at bump trigger ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION v2_threads_bump_last_message_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE v2_threads
     SET last_message_at = NEW.created_at
   WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER v2_thread_messages_bump_thread
  AFTER INSERT ON v2_thread_messages
  FOR EACH ROW EXECUTE FUNCTION v2_threads_bump_last_message_at();
