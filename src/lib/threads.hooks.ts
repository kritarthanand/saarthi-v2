import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from './api';
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
  system_prompt: string | null;
  chat_model: string | null;
  task_count: number;
  done_count: number;
  points_earned: number;
  points_total: number;
  last_message_at: string | null;
  last_message_preview: string | null;
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
    system_prompt: w.system_prompt ?? null,
    chat_model: w.chat_model ?? null,
    task_count: w.task_count,
    done_count: w.done_count,
    points_earned: w.points_earned,
    points_total: w.points_total,
    last_message_at: w.last_message_at ?? null,
    last_message_preview: w.last_message_preview ?? null,
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

/** RN-safe uuid v4. Falls back to Math.random if crypto.randomUUID is missing. */
function uuidv4(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Send a user message and receive the AI reply in one round-trip.
 *
 * Returns `{ user, ai }`. `ai` is `null` for non-user roles (server only
 * generates an AI reply when role === 'user'); for user sends the backend
 * always returns a row — either the model reply or a system-role error row.
 *
 * Generates an idempotency_key (uuid v4) per send so retried POSTs from a
 * flaky network / double-tap don't double-bill the LLM.
 */
export function useSendMessage(): (
  threadId: string,
  content: string,
  taskRef?: string,
  role?: string,
) => Promise<{ user: ThreadMessage; ai: ThreadMessage | null }> {
  return useCallback(async (threadId, content, taskRef, role = 'user') => {
    const resp = await apiFetch<{ user_message: WireMessage; ai_message: WireMessage | null }>(
      `/threads/${threadId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          role,
          content,
          task_ref: taskRef ?? null,
          idempotency_key: uuidv4(),
        }),
      },
    );
    return {
      user: toMessage(resp.user_message),
      ai: resp.ai_message ? toMessage(resp.ai_message) : null,
    };
  }, []);
}

/**
 * Patch a thread's editable fields.
 *
 * PATCH body semantics:
 * - Omitted key → no change.
 * - Explicit `null` for `system_prompt` / `chat_model` → clears the column
 *   (SQL NULL). `title` and `coach_id` reject null (they're required).
 *
 * Note: `JSON.stringify({ system_prompt: undefined })` drops the key, which is
 * the "no change" path. Pass `null` deliberately when the user clears the
 * field.
 */
export function usePatchThread(): (
  threadId: string,
  patch: {
    title?: string;
    system_prompt?: string | null;
    chat_model?: string | null;
    coach_id?: string;
  },
) => Promise<Thread> {
  return useCallback(async (threadId, patch) => {
    const w = await apiFetch<WireThread>(`/threads/${threadId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return toThread(w);
  }, []);
}

/**
 * Upload an audio recording (file:// URI from expo-audio) to /transcribe and
 * return the transcript text. The FormData entry uses the RN-only
 * { uri, type, name } shape — NOT a Blob.
 */
export function useTranscribe(): (
  audio: { uri: string; type?: string; name?: string },
) => Promise<string> {
  return useCallback(async ({ uri, type = 'audio/m4a', name = 'recording.m4a' }) => {
    const { getProxyUrl } = await import('./config');
    const base = await getProxyUrl();
    // Expo SDK 56's WinterCG fetch rejects the legacy RN `{uri, name, type}`
    // FormData part shape ("Unsupported FormDataPart implementation"). Route the
    // upload through XMLHttpRequest, which uses RN's native networking layer
    // and still accepts that shape.
    const form = new FormData();
    form.append('file', { uri, type, name } as unknown as Blob);
    return await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}/transcribe`);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText) as { text: string };
            resolve(json.text ?? '');
          } catch (e) {
            reject(new Error(`bad json from /transcribe: ${String(e)}`));
          }
        } else {
          let detail = `HTTP ${xhr.status}`;
          try {
            const body = JSON.parse(xhr.responseText) as { detail?: unknown };
            if (typeof body.detail === 'string') detail = body.detail;
          } catch {
            /* keep generic */
          }
          reject(Object.assign(new Error(detail), { status: xhr.status }));
        }
      };
      xhr.onerror = () => reject(new Error('network error during /transcribe'));
      xhr.send(form);
    });
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
