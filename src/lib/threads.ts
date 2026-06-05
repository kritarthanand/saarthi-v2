// String union keeps the runtime value identical to what Supabase stores/returns,
// avoiding the enum impedance mismatch. The companion const gives the same
// call-site ergonomics: ThreadTemplate.MorningRitual === 'morning_ritual'.
export type ThreadTemplate =
  | 'morning_ritual'
  | 'evening_ritual'
  | 'weekly_ritual';

export const ThreadTemplate = {
  MorningRitual: 'morning_ritual',
  EveningRitual: 'evening_ritual',
  WeeklyRitual:  'weekly_ritual',
} as const satisfies Record<string, ThreadTemplate>;

export type CoachId = 'nakula' | 'bheem' | 'arjun' | 'yudi' | 'sahdev';

export type Thread = {
  id: string;
  template: ThreadTemplate;
  coach_id: CoachId;
  tag: string;
  title: string;
  activeEntryId: string | null;
  lastEntryAt: string | null;
};

export type Entry = {
  id: string;
  thread_id: string;
  status: 'active' | 'closed';
  label: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  closed_at: string | null;
};

// Used by the upcoming checklist-items layer (Workstream A integration).
export type EntryItem = {
  id: string;
  entry_id: string;
  section: string | null;
  label: string;
  done: boolean;
  points: number;
  position: number;
  priority?: 'high' | 'med' | 'low';
  scheduled?: string;
  meta: Record<string, unknown>;
};

export type EntryMessage = {
  id: string;
  entry_id: string;
  role: 'ai' | 'user';
  text: string;
  item_ref: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};
