import { useCallback, useEffect, useRef, useState } from 'react';

import { getProxyUrl } from './config';
import type { Task, TaskStatus, Thread, ThreadMessage } from './threads';

// ── Wire types (snake_case from FastAPI) ──────────────────────────────────────

type WireThread = {
  id: string;
  user_id: string;
  template: string;
  coach_id: string;
  tag: string;
  title: string | null;
  period_key: string | null;
  archived_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  task_count: number;
  done_count: number;
  points_earned: number;
  points_total: number;
};

type WireTask = {
  id: string;
  thread_id: string;
  user_id: string;
  title: string;
  status: string;
  priority: string;
  points: number;
  section: string | null;
  scheduled_for: string | null;
  due_at: string | null;
  position: number;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type WireMessage = {
  id: string;
  thread_id: string;
  role: string;
  content: string;
  task_ref: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

// ── Mapping helpers ───────────────────────────────────────────────────────────

function toThread(w: WireThread): Thread {
  return {
    id: w.id,
    user_id: w.user_id,
    template: w.template,
    coach_id: w.coach_id as Thread['coach_id'],
    tag: w.tag,
    title: w.title ?? '',
    period_key: w.period_key,
    archived_at: w.archived_at,
    meta: w.meta,
    created_at: w.created_at,
    task_count: w.task_count,
    done_count: w.done_count,
    points_earned: w.points_earned,
    points_total: w.points_total,
  };
}

function toTask(w: WireTask): Task {
  return {
    id: w.id,
    thread_id: w.thread_id,
    user_id: w.user_id,
    title: w.title,
    status: w.status as Task['status'],
    priority: w.priority as Task['priority'],
    points: w.points,
    section: w.section,
    scheduled_for: w.scheduled_for,
    due_at: w.due_at,
    position: w.position,
    meta: w.meta,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

function toMessage(w: WireMessage): ThreadMessage {
  return {
    id: w.id,
    thread_id: w.thread_id,
    role: w.role as ThreadMessage['role'],
    content: w.content,
    task_ref: w.task_ref,
    meta: w.meta,
    created_at: w.created_at,
  };
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = await getProxyUrl();
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as { detail?: unknown })?.detail;
    const msg = typeof detail === 'string' ? detail : (typeof detail === 'object' && detail !== null && 'error' in detail ? String((detail as { error: unknown }).error) : `HTTP ${res.status}`);
    throw Object.assign(new Error(msg), { status: res.status, body, detail });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useThreads(filter?: { template?: string; today?: boolean }): {
  threads: Thread[];
  loading: boolean;
  error: Error | null;
  refresh(): void;
} {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const rev = useRef(0);

  const load = useCallback(() => {
    const tick = ++rev.current;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filter?.template) params.set('template', filter.template);
    if (filter?.today) params.set('today', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    apiFetch<WireThread[]>(`/threads${qs}`)
      .then((rows) => {
        if (rev.current !== tick) return;
        setThreads(rows.map(toThread));
        setLoading(false);
      })
      .catch((e: Error) => {
        if (rev.current !== tick) return;
        setError(e);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.template, filter?.today]);

  useEffect(() => { load(); }, [load]);

  return { threads, loading, error, refresh: load };
}

export function useThread(threadId: string | null): {
  thread: Thread | null;
  tasks: Task[];
  messages: ThreadMessage[];
  loading: boolean;
  error: Error | null;
  refresh(): void;
} {
  const [thread, setThread] = useState<Thread | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(threadId != null);
  const [error, setError] = useState<Error | null>(null);
  const rev = useRef(0);

  const load = useCallback(() => {
    if (!threadId) {
      setThread(null);
      setTasks([]);
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }
    const tick = ++rev.current;
    setLoading(true);
    setError(null);
    apiFetch<{ thread: WireThread; tasks: WireTask[]; messages: WireMessage[] }>(`/threads/${threadId}`)
      .then((data) => {
        if (rev.current !== tick) return;
        setThread(toThread(data.thread));
        setTasks(data.tasks.map(toTask));
        setMessages(data.messages.map(toMessage));
        setLoading(false);
      })
      .catch((e: Error) => {
        if (rev.current !== tick) return;
        setError(e);
        setLoading(false);
      });
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  return { thread, tasks, messages, loading, error, refresh: load };
}

export function useTasks(threadId: string | null): {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  refresh(): void;
} {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(threadId != null);
  const [error, setError] = useState<Error | null>(null);
  const rev = useRef(0);

  const load = useCallback(() => {
    if (!threadId) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return;
    }
    const tick = ++rev.current;
    setLoading(true);
    setError(null);
    apiFetch<WireTask[]>(`/threads/${threadId}/tasks`)
      .then((rows) => {
        if (rev.current !== tick) return;
        setTasks(rows.map(toTask));
        setLoading(false);
      })
      .catch((e: Error) => {
        if (rev.current !== tick) return;
        setError(e);
        setLoading(false);
      });
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  return { tasks, loading, error, refresh: load };
}

export function useMessages(threadId: string | null): {
  messages: ThreadMessage[];
  loading: boolean;
  error: Error | null;
  refresh(): void;
} {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(threadId != null);
  const [error, setError] = useState<Error | null>(null);
  const rev = useRef(0);

  const load = useCallback(() => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }
    const tick = ++rev.current;
    setLoading(true);
    setError(null);
    apiFetch<WireMessage[]>(`/threads/${threadId}/messages`)
      .then((rows) => {
        if (rev.current !== tick) return;
        setMessages(rows.map(toMessage));
        setLoading(false);
      })
      .catch((e: Error) => {
        if (rev.current !== tick) return;
        setError(e);
        setLoading(false);
      });
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  return { messages, loading, error, refresh: load };
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useCreateTask(): (
  threadId: string,
  body: {
    title: string;
    priority?: string;
    points?: number;
    section?: string;
    position?: number;
    meta?: Record<string, unknown>;
  },
) => Promise<Task> {
  return useCallback(async (threadId, body) => {
    const w = await apiFetch<WireTask>(`/threads/${threadId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return toTask(w);
  }, []);
}

export function usePatchTask(): (
  taskId: string,
  patch: {
    title?: string;
    status?: string;
    priority?: string;
    points?: number;
    section?: string;
    scheduled_for?: string;
    due_at?: string;
    position?: number;
    meta?: Record<string, unknown>;
  },
) => Promise<Task> {
  return useCallback(async (taskId, patch) => {
    const w = await apiFetch<WireTask>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return toTask(w);
  }, []);
}

export function useDropTask(): (taskId: string) => Promise<Task> {
  return useCallback(async (taskId) => {
    const w = await apiFetch<WireTask>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'dropped' }),
    });
    return toTask(w);
  }, []);
}

export function useSendMessage(): (
  threadId: string,
  content: string,
  taskRef?: string,
  role?: string,
) => Promise<ThreadMessage> {
  return useCallback(async (threadId, content, taskRef, role = 'user') => {
    const w = await apiFetch<WireMessage>(`/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content, task_ref: taskRef ?? null }),
    });
    return toMessage(w);
  }, []);
}

// Ensure the user's opt-in scheduled templates exist for today/this week.
// Server-side, idempotent, and delete-aware. Call on app load.
export function useEnsureToday(): () => Promise<void> {
  return useCallback(async () => {
    await apiFetch<void>('/threads/ensure-today', { method: 'POST' });
  }, []);
}

export function useDeleteThread(): (threadId: string) => Promise<void> {
  return useCallback(async (threadId) => {
    await apiFetch<void>(`/threads/${threadId}`, { method: 'DELETE' });
  }, []);
}

export function useCreateThread(): (template: string) => Promise<Thread> {
  return useCallback(async (template) => {
    const w = await apiFetch<WireThread>('/threads', {
      method: 'POST',
      body: JSON.stringify({ template }),
    });
    return toThread(w);
  }, []);
}

// The server computes the authoritative period_key from the user's timezone,
// so callers don't pass one (avoids timezone-mismatched duplicate occurrences).
export function useUpsertOccurrence(): (
  template: string,
) => Promise<{ thread: Thread; created: boolean }> {
  return useCallback(async (template) => {
    const result = await apiFetch<{ thread: WireThread; created: boolean }>(
      `/threads/occurrence`,
      {
        method: 'POST',
        body: JSON.stringify({ template }),
      },
    );
    return { thread: toThread(result.thread), created: result.created };
  }, []);
}
