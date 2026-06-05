/**
 * Adapter: live Supabase-backed { Thread, Entry, items[], messages[] } bundles
 * → the legacy mockData `Thread` shape consumed by TodayView / ChatHistoryView /
 * ThreadDetail. Temporary bridge until those components migrate to the new
 * types directly.
 */

import type { ChatMessage, Thread as LegacyThread, ThreadItem } from './mockData';
import type { Entry, EntryItem, EntryMessage, Thread } from './threads';
import { ThreadTemplate } from './threads';

function fmtTimeOfDay(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function toLegacyItem(item: EntryItem): ThreadItem {
  const out: ThreadItem = {
    id: item.id,
    label: item.label,
    done: item.done,
    points: item.points,
  };
  const meta = item.meta as Record<string, unknown>;
  if (meta && meta.has_chat === true) out.hasChat = true;
  if (item.scheduled) out.scheduled = item.scheduled;
  if (item.priority) out.priority = item.priority;
  return out;
}

function toLegacyMessage(m: EntryMessage): ChatMessage {
  const meta = m.meta as Record<string, unknown>;
  const tag = typeof meta?.tag === 'string' ? meta.tag : undefined;
  const out: ChatMessage = {
    from: m.role === 'user' ? 'me' : 'ai',
    text: m.text,
    time: fmtTimeOfDay(m.created_at),
  };
  if (tag) out.meta = tag;
  if (m.item_ref) out.itemRef = m.item_ref;
  return out;
}

const DEFAULT_MANTRA: Partial<Record<ThreadTemplate, string>> = {
  [ThreadTemplate.MorningRitual]: 'Seize the day.',
};

export function adaptLiveThread(
  thread: Thread,
  bundle: { entry: Entry; items: EntryItem[]; messages: EntryMessage[] } | undefined,
): LegacyThread {
  const items = (bundle?.items ?? []).slice().sort((a, b) => a.position - b.position);
  const messages = bundle?.messages ?? [];

  const doneCount = items.filter((i) => i.done).length;
  const pointsEarned = items.filter((i) => i.done).reduce((s, i) => s + i.points, 0);
  const pointsTotal = items.reduce((s, i) => s + i.points, 0);

  const entryMeta = (bundle?.entry.meta ?? {}) as Record<string, unknown>;
  const mantra =
    typeof entryMeta.mantra === 'string'
      ? (entryMeta.mantra as string)
      : DEFAULT_MANTRA[thread.template];

  // Pick a kind that satisfies ThreadKind; the dispatcher reads `tag`, not kind,
  // for template threads, so this is just a fallback for any legacy code paths.
  const kind: LegacyThread['kind'] =
    thread.template === ThreadTemplate.EveningRitual ? 'evening' : 'checklist';

  const subtitle =
    items.length > 0
      ? `${doneCount} of ${items.length} done`
      : bundle?.entry.label ?? '';

  const createdAtMs = bundle ? new Date(bundle.entry.created_at).getTime() : Date.now();

  return {
    id: thread.id,
    tag: thread.tag,
    kind,
    subtitle,
    timeAgo: bundle?.entry.label ?? '',
    items: items.map(toLegacyItem),
    messages: messages.map(toLegacyMessage),
    pointsEarned,
    pointsTotal,
    mantra,
    locked: false,
    createdAt: createdAtMs,
  };
}
