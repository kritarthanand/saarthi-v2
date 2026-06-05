export enum ThreadTemplate {
  MorningRitual = 'morning_ritual',
  EveningRitual = 'evening_ritual',
  WeeklyRitual  = 'weekly_ritual',
}

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
