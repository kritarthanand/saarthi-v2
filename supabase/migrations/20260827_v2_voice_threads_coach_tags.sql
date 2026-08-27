-- Voice threads are named after the Pandava you talked to, not a generic "Voice".
--
-- New threads get this from the server (see start_voice_session in server/main.py),
-- which now writes tag = '#<CoachName>' and title = '<CoachName>'. This backfills
-- the rows created before that change.
--
-- Display only: every code path keys off template = 'voice_session', never the tag,
-- so nothing behavioural depends on this (the Obsidian exporter included).
--
-- Idempotent: scoped to rows still carrying the old '#Voice' tag, so re-running is
-- a no-op and a thread the user has since renamed by hand is left alone.

update v2_threads t
set
  tag   = '#' || c.name,
  title = c.name
from (values
  ('nakula', 'Nakula'),
  ('bheem',  'Bheem'),
  ('arjun',  'Arjun'),
  ('yudi',   'Yudi'),
  ('sahdev', 'Sahdev')
) as c(id, name)
where t.template = 'voice_session'
  and t.tag = '#Voice'
  and t.coach_id = c.id;
