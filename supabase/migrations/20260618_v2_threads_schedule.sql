-- v2_threads: add scheduled wall-clock times + updated_at.
--
-- scheduled_start_time / scheduled_end_time are stored as HH:MM text in the
-- user's local time. End is optional. Display/sort lives in the client.
-- updated_at tracks last-edited time and is auto-touched by a trigger.

ALTER TABLE v2_threads
  ADD COLUMN IF NOT EXISTS scheduled_start_time text,
  ADD COLUMN IF NOT EXISTS scheduled_end_time   text,
  ADD COLUMN IF NOT EXISTS updated_at           timestamptz NOT NULL DEFAULT now();

ALTER TABLE v2_threads
  DROP CONSTRAINT IF EXISTS v2_threads_sched_start_fmt,
  ADD  CONSTRAINT v2_threads_sched_start_fmt
       CHECK (scheduled_start_time IS NULL OR scheduled_start_time ~ '^[0-2][0-9]:[0-5][0-9]$');

ALTER TABLE v2_threads
  DROP CONSTRAINT IF EXISTS v2_threads_sched_end_fmt,
  ADD  CONSTRAINT v2_threads_sched_end_fmt
       CHECK (scheduled_end_time IS NULL OR scheduled_end_time ~ '^[0-2][0-9]:[0-5][0-9]$');

-- Backfill ritual defaults for existing rows that don't have a start time.
UPDATE v2_threads SET scheduled_start_time = '06:00'
  WHERE template = 'morning_ritual' AND scheduled_start_time IS NULL;
UPDATE v2_threads SET scheduled_start_time = '21:00'
  WHERE template = 'evening_ritual' AND scheduled_start_time IS NULL;

-- Reuse the existing v2_set_updated_at() trigger function from v2_profiles.
DROP TRIGGER IF EXISTS v2_threads_set_updated_at ON v2_threads;
CREATE TRIGGER v2_threads_set_updated_at
  BEFORE UPDATE ON v2_threads
  FOR EACH ROW EXECUTE FUNCTION v2_set_updated_at();
