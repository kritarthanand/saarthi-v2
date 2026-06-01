export type Thread = {
  id: string;
  user_id: string;
  title: string;
  icon: string | null;
  summary: string | null;
  pinned: boolean;
  archived_at: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

export type ThreadMessage = {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  meta: Record<string, unknown>;
  created_at: string;
};
