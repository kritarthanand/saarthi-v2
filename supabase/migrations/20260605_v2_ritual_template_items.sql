-- Canonical item templates for ritual threads.
-- Rows are seeded once and read at entry-creation time to auto-populate v2_entry_items.
CREATE TABLE IF NOT EXISTS v2_ritual_template_items (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text    NOT NULL,
  position integer NOT NULL,
  label    text    NOT NULL,
  points   integer NOT NULL DEFAULT 0,
  section  text,
  meta     jsonb   NOT NULL DEFAULT '{}'::jsonb
);

-- Unique on (template, section, position) so re-running the seed is a no-op.
-- NULLS NOT DISTINCT (PG 15+) — without it, two rows with section=NULL and the
-- same (template, position) are considered distinct and would slip through.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'v2_ritual_template_items_uniq'
  ) THEN
    ALTER TABLE v2_ritual_template_items
      ADD CONSTRAINT v2_ritual_template_items_uniq
      UNIQUE NULLS NOT DISTINCT (template, section, position);
  END IF;
END $$;

INSERT INTO v2_ritual_template_items (template, position, label, points, section, meta) VALUES
  ('morning_ritual', 0,  'Weight measurement',      2, NULL, '{"type":"action"}'),
  ('morning_ritual', 1,  'Dental Care',              2, NULL, '{"type":"action"}'),
  ('morning_ritual', 2,  'Shower',                   4, NULL, '{"type":"action"}'),
  ('morning_ritual', 3,  'Skin Care',                3, NULL, '{"type":"action"}'),
  ('morning_ritual', 4,  'Dress + Puja',             5, NULL, '{"type":"action"}'),
  ('morning_ritual', 5,  'Pills',                    3, NULL, '{"type":"action"}'),
  ('morning_ritual', 6,  'Get Water',                2, NULL, '{"type":"action"}'),
  ('morning_ritual', 7,  'Defrost food',             2, NULL, '{"type":"action"}'),
  ('morning_ritual', 8,  'Review Weekly Goals',      5, NULL, '{"type":"action"}'),
  ('morning_ritual', 9,  'Visualize',                5, NULL, '{"type":"action"}'),
  ('morning_ritual', 10, 'Top 3 Goals for the day',  8, NULL, '{"type":"reflection"}'),
  ('morning_ritual', 11, 'Time Block for the day',   6, NULL, '{"type":"reflection"}'),
  ('morning_ritual', 12, 'Read 10 min',              5, NULL, '{"type":"action"}'),
  ('evening_ritual', 0,  'Meal Logs for the day',               5, NULL, '{"type":"action"}'),
  ('evening_ritual', 1,  'Workout for the day',                 5, NULL, '{"type":"action"}'),
  ('evening_ritual', 2,  'Review top 3 priorities for the day', 8, NULL, '{"type":"morning_review"}'),
  ('evening_ritual', 3,  'Review focus sessions',               5, NULL, '{"type":"action"}'),
  ('evening_ritual', 4,  'Plan the next day',                   8, NULL, '{"type":"reflection"}'),
  ('weekly_ritual',  0,  'What were your 3 biggest wins this week?',     5, 'review', '{"type":"reflection"}'),
  ('weekly_ritual',  1,  'What drained you the most?',                   5, 'review', '{"type":"reflection"}'),
  ('weekly_ritual',  2,  'Where did you lose focus or time?',            5, 'review', '{"type":"reflection"}'),
  ('weekly_ritual',  3,  'One thing you''re proud of yourself for',      5, 'review', '{"type":"reflection"}'),
  ('weekly_ritual',  4,  'Which habit or ritual needs more attention?',  5, 'review', '{"type":"reflection"}'),
  ('weekly_ritual',  0,  'What''s the one most important thing this week?', 5, 'plan', '{"type":"reflection"}'),
  ('weekly_ritual',  1,  'Which habits do you want to protect?',             5, 'plan', '{"type":"reflection"}'),
  ('weekly_ritual',  2,  'What will you do differently vs last week?',       5, 'plan', '{"type":"reflection"}'),
  ('weekly_ritual',  3,  'Any blocks or challenges to watch for?',           5, 'plan', '{"type":"reflection"}')
ON CONFLICT ON CONSTRAINT v2_ritual_template_items_uniq DO NOTHING;
