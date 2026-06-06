import { useCallback, useEffect, useRef, useState } from 'react';

import { getProxyUrl } from './config';
import type { Thread, Entry, EntryItem, EntryMessage, CoachId } from './threads';

// ── Wire types (snake_case from FastAPI) ──────────────────────────────────────

type WireThread = {
  id: string;
  template: string;
  coach_id: string;
  tag: string;
  title: string;
  active_entry_id: string | null;
  last_entry_at: string | null;
};

type WireEntry = {
  id: string;
  thread_id: string;
  status: string;
  label: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  closed_at: string | null;
};

type WireItem = {
  id: string;
  entry_id: string;
  section: string | null;
  label: string;
  done: boolean;
  points: number;
  position: number;
  priority: string | null;
  scheduled: string | null;
  meta: Record<string, unknown>;
};

type WireMessage = {
  id: string;
  entry_id: string;
  role: string;
  text: string;
  item_ref: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

// ── Mapping helpers ───────────────────────────────────────────────────────────

function toThread(w: WireThread): Thread {
  return {
    id: w.id,
    template: w.template as Thread['template'],
    coach_id: w.coach_id as CoachId,
    tag: w.tag,
    title: w.title,
    activeEntryId: w.active_entry_id,
    lastEntryAt: w.last_entry_at,
  };
}

function toEntry(w: WireEntry): Entry {
  return {
    id: w.id,
    thread_id: w.thread_id,
    status: w.status as Entry['status'],
    label: w.label,
    meta: w.meta,
    created_at: w.created_at,
    closed_at: w.closed_at,
  };
}

function toItem(w: WireItem): EntryItem {
  const item: EntryItem = {
    id: w.id,
    entry_id: w.entry_id,
    section: w.section,
    label: w.label,
    done: w.done,
    points: w.points,
    position: w.position,
    meta: w.meta,
  };
  if (w.priority) item.priority = w.priority as EntryItem['priority'];
  if (w.scheduled) item.scheduled = w.scheduled;
  return item;
}

function toMessage(w: WireMessage): EntryMessage {
  return {
    id: w.id,
    entry_id: w.entry_id,
    role: w.role as EntryMessage['role'],
    text: w.text,
    item_ref: w.item_ref,
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
    const detail = body?.detail;
    const msg = typeof detail === 'string' ? detail : (detail?.error ?? `HTTP ${res.status}`);
    throw Object.assign(new Error(msg), { status: res.status, body, detail });
  }
  return res.json() as Promise<T>;
}

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useThreads(filter?: { coachId?: CoachId; today?: boolean }): {
  data: Thread[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useState<Thread[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const rev = useRef(0);

  const fetch = useCallback(() => {
    const tick = ++rev.current;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filter?.coachId) params.set('coach_id', filter.coachId);
    if (filter?.today) params.set('today', '1');
    const qs = params.toString();
    apiFetch<WireThread[]>(`/threads${qs ? `?${qs}` : ''}`)
      .then((rows) => { if (rev.current === tick) { setData(rows.map(toThread)); setLoading(false); } })
      .catch((e) => { if (rev.current === tick) { setError(e); setLoading(false); } });
  }, [filter?.coachId, filter?.today]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useThread(threadId: string): {
  thread: Thread | null;
  entries: Entry[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [thread, setThread] = useState<Thread | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const rev = useRef(0);

  const fetch = useCallback(() => {
    const tick = ++rev.current;
    setLoading(true);
    setError(null);
    apiFetch<{ thread: WireThread; entries: WireEntry[] }>(`/threads/${threadId}`)
      .then(({ thread: t, entries: es }) => {
        if (rev.current !== tick) return;
        setThread(toThread(t));
        setEntries(es.map(toEntry));
        setLoading(false);
      })
      .catch((e) => { if (rev.current === tick) { setError(e); setLoading(false); } });
  }, [threadId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { thread, entries, loading, error, refetch: fetch };
}

export function useEntry(entryId: string): {
  entry: Entry | null;
  items: EntryItem[];
  messages: EntryMessage[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [items, setItems] = useState<EntryItem[]>([]);
  const [messages, setMessages] = useState<EntryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const rev = useRef(0);

  const fetch = useCallback(() => {
    if (!entryId) {
      // No active entry yet — clear stale state and bail. Avoids 404s during
      // the brief window between thread-list-load and entry-load.
      setEntry(null);
      setItems([]);
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }
    const tick = ++rev.current;
    setLoading(true);
    setError(null);
    apiFetch<{ entry: WireEntry; items: WireItem[]; messages: WireMessage[] }>(`/entries/${entryId}`)
      .then(({ entry: e, items: is, messages: ms }) => {
        if (rev.current !== tick) return;
        setEntry(toEntry(e));
        setItems(is.map(toItem));
        setMessages(ms.map(toMessage));
        setLoading(false);
      })
      .catch((e) => { if (rev.current === tick) { setError(e); setLoading(false); } });
  }, [entryId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { entry, items, messages, loading, error, refetch: fetch };
}

/**
 * Loads the active entry (with items + messages) for each thread in `threads`,
 * in parallel. Returns a map keyed by entry id. Re-fetches when the active-entry
 * id of any thread changes — call `refetch()` after a mutation to refresh.
 */
export function useActiveEntries(threads: Thread[] | null): {
  byId: Record<string, { entry: Entry; items: EntryItem[]; messages: EntryMessage[] }>;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [byId, setById] = useState<Record<string, { entry: Entry; items: EntryItem[]; messages: EntryMessage[] }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const rev = useRef(0);

  // Stable key so we re-fetch on activeEntryId churn, not on every threads-array identity change.
  const activeIdsKey = (threads ?? [])
    .map((t) => t.activeEntryId ?? '')
    .join(',');

  const fetch = useCallback(() => {
    if (!threads) return;
    const ids = threads.map((t) => t.activeEntryId).filter((x): x is string => !!x);
    if (ids.length === 0) {
      setById({});
      return;
    }
    const tick = ++rev.current;
    setLoading(true);
    setError(null);
    Promise.all(
      ids.map((id) =>
        apiFetch<{ entry: WireEntry; items: WireItem[]; messages: WireMessage[] }>(`/entries/${id}`),
      ),
    )
      .then((bundles) => {
        if (rev.current !== tick) return;
        const map: Record<string, { entry: Entry; items: EntryItem[]; messages: EntryMessage[] }> = {};
        bundles.forEach((b, i) => {
          map[ids[i]] = {
            entry: toEntry(b.entry),
            items: b.items.map(toItem),
            messages: b.messages.map(toMessage),
          };
        });
        setById(map);
        setLoading(false);
      })
      .catch((e) => {
        if (rev.current !== tick) return;
        setError(e);
        setLoading(false);
      });
  }, [activeIdsKey]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  return { byId, loading, error, refetch: fetch };
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useToggleItem(): (itemId: string, done: boolean) => Promise<void> {
  return useCallback(async (itemId: string, done: boolean) => {
    await apiFetch<WireItem>(`/entry_items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ done }),
    });
  }, []);
}

export function useSendMessage(): (
  entryId: string,
  text: string,
  itemRef?: string,
) => Promise<EntryMessage> {
  return useCallback(async (entryId, text, itemRef) => {
    const w = await apiFetch<WireMessage>(`/entries/${entryId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', text, item_ref: itemRef ?? null }),
    });
    return toMessage(w);
  }, []);
}

export function useOpenEntry(): (
  threadId: string,
  seed?: { label?: string; items?: Record<string, unknown>[]; messages?: Record<string, unknown>[] },
) => Promise<Entry> {
  return useCallback(async (threadId, seed) => {
    const w = await apiFetch<WireEntry>(`/threads/${threadId}/entries`, {
      method: 'POST',
      body: JSON.stringify({
        label: seed?.label ?? null,
        items: seed?.items ?? [],
        messages: seed?.messages ?? [],
      }),
    });
    return toEntry(w);
  }, []);
}

export function useCloseEntry(): (entryId: string) => Promise<Entry> {
  return useCallback(async (entryId) => {
    const w = await apiFetch<WireEntry>(`/entries/${entryId}/close`, { method: 'PATCH' });
    return toEntry(w);
  }, []);
}

/**
 * Shallow-merge `metaPatch` into the entry's meta. Pass `null` for a key to
 * unset it. Returns the updated entry.
 */
export function usePatchEntryMeta(): (
  entryId: string,
  metaPatch: Record<string, unknown>,
) => Promise<Entry> {
  return useCallback(async (entryId, metaPatch) => {
    const w = await apiFetch<WireEntry>(`/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ meta: metaPatch }),
    });
    return toEntry(w);
  }, []);
}
