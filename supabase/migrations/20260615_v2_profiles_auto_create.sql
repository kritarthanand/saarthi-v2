-- Per-user "auto-create today's threads" preference.
--
-- auto_create_templates: which scheduled templates to ensure exist each day/week
--   when the user opens the app. Defaults to the morning + evening rituals.
-- auto_create_marks: server-managed bookkeeping mapping template -> the last
--   period_key we auto-created for it (e.g. {"morning_ritual": "2026-06-15"}).
--   This is what lets a manual delete stick: once we've auto-created a
--   template for the current period, we won't recreate it again until the
--   period rolls over, so deleting it doesn't instantly resurrect it.

ALTER TABLE v2_profiles
  ADD COLUMN IF NOT EXISTS auto_create_templates jsonb NOT NULL
    DEFAULT '["morning_ritual","evening_ritual"]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_create_marks jsonb NOT NULL
    DEFAULT '{}'::jsonb;
