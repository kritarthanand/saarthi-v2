-- V2 profiles — one row per auth user, tuning identity, coach voice,
-- model + TTS preferences, and day-boundary hours.
-- Prefixed with `v2_` to avoid colliding with V1's `user_profile` table
-- in the shared Supabase project.

CREATE TABLE v2_profiles (
  id                       uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name                     text NOT NULL DEFAULT '',
  bio                      text NOT NULL DEFAULT '',
  personality              text NOT NULL DEFAULT 'stoic'
    CHECK (personality IN ('stoic', 'hype', 'zen')),
  preferred_chat_model     text NOT NULL DEFAULT 'gpt_4o'
    CHECK (preferred_chat_model IN ('gpt_4o', 'gpt_5_4', 'claude_sonnet', 'claude_opus')),
  tts_voice                text NOT NULL DEFAULT 'nova'
    CHECK (tts_voice IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
  timezone                 text NOT NULL DEFAULT 'America/Los_Angeles',
  day_start_hour           int  NOT NULL DEFAULT 0
    CHECK (day_start_hour BETWEEN 0 AND 7),
  morning_deadline_hour    int  NOT NULL DEFAULT 12
    CHECK (morning_deadline_hour BETWEEN 9 AND 14),
  evening_start_hour       int  NOT NULL DEFAULT 17
    CHECK (evening_start_hour BETWEEN 17 AND 23),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE v2_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY v2_profiles_user_rls ON v2_profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Reuses the v2-scoped updated_at trigger function created by the threads
-- migration. Declared CREATE OR REPLACE so this file is safe to apply
-- before or after 20260531_v2_threads.sql.
CREATE OR REPLACE FUNCTION v2_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER v2_profiles_set_updated_at
  BEFORE UPDATE ON v2_profiles
  FOR EACH ROW EXECUTE FUNCTION v2_set_updated_at();
