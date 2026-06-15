// Thread-as-occurrence model.
// Template is now an open string — no DB enum, code-registry only.
// Entry / EntryItem / EntryMessage types removed; replaced by Task / ThreadMessage.

export type CoachId = 'nakula' | 'bheem' | 'arjun' | 'yudi' | 'sahdev';

export type ThreadTemplate =
  | 'morning_ritual'
  | 'evening_ritual'
  | 'weekly_ritual'
  | 'freeform'
  | 'meal_logging'
  | 'workout_logging'
  | 'focus_time'
  | 'clean_ritual'
  | 'catch_up';

export type Thread = {
  id: string;
  user_id: string;
  template: string;
  coach_id: CoachId;
  tag: string;
  title: string;
  period_key: string | null;
  archived_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  // Computed by server
  task_count: number;
  done_count: number;
  points_earned: number;
  points_total: number;
};

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'dropped';
export type TaskPriority = 'high' | 'med' | 'low';

export type Task = {
  id: string;
  thread_id: string;
  user_id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  points: number;
  section: string | null;
  scheduled_for: string | null; // 'YYYY-MM-DD'
  due_at: string | null;
  position: number;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MessageRole = 'user' | 'ai' | 'system' | 'tool';

export type ThreadMessage = {
  id: string;
  thread_id: string;
  role: MessageRole;
  content: string;
  task_ref: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};
