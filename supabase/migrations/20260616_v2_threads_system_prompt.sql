-- chat-audio-thread-editing: per-thread system prompt + chat model override
-- + idempotency key for user-message POSTs.
--
-- Keep CHECK in sync with v2_profiles.preferred_chat_model
-- (supabase/migrations/20260531_v2_profiles.sql) and with
-- llm.CHAT_MODELS in server/llm.py. If you add/rename a key, widen all
-- three together in a follow-up migration.

ALTER TABLE v2_threads
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS chat_model    text
    CHECK (chat_model IS NULL OR chat_model IN
      ('claude_opus', 'claude_sonnet', 'gpt_4o', 'gpt_5_4'));

-- Length cap mirrors the server-side validation in PATCH /threads/{id}.
-- Pre-PG15 has no IF NOT EXISTS for ADD CONSTRAINT, so guard via DO block
-- to keep `supabase db push` idempotent across re-runs.
DO $$
BEGIN
  ALTER TABLE v2_threads
    ADD CONSTRAINT v2_threads_system_prompt_len
    CHECK (system_prompt IS NULL OR char_length(system_prompt) <= 4000);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Idempotency key on the messages table. Partial unique index ensures we can
-- dedupe POST /threads/{id}/messages by (thread_id, idempotency_key) without
-- blocking the legacy rows whose key is NULL.
ALTER TABLE v2_thread_messages
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS v2_thread_messages_idem_uniq
  ON v2_thread_messages (thread_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Backout (manual if needed):
-- DROP INDEX IF EXISTS v2_thread_messages_idem_uniq;
-- ALTER TABLE v2_thread_messages DROP COLUMN IF EXISTS idempotency_key;
-- ALTER TABLE v2_threads
--   DROP CONSTRAINT IF EXISTS v2_threads_system_prompt_len,
--   DROP COLUMN IF EXISTS chat_model,
--   DROP COLUMN IF EXISTS system_prompt;
