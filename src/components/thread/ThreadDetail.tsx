import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { subtitleFor, type Thread } from '@/lib/mockData';
import { TAG_TO_TEMPLATE, TEMPLATE_REGISTRY } from '@/lib/threadTemplates';
import type { Entry, EntryItem, EntryMessage, ThreadTemplate } from '@/lib/threads';
import { apiFetch, useEntry, usePatchEntryMeta, useThread } from '@/lib/threads.hooks';
import { Composer } from '../Composer';
import { Hashtag } from '../Hashtag';
import { BackIcon, ChevRightIcon, DotsIcon } from '../icons';
import { SaarthiLogo } from '../SaarthiLogo';
import { FocusSummary } from './FocusSummary';
import { MorningSummary } from './MorningSummary';
import { NoteSummary } from './NoteSummary';
import { ThreadChat } from './ThreadChat';
import { ThreadChatTab } from './ThreadChatTab';

let _localMsgId = 0;

function groupEntriesByDate(entries: Entry[]): Array<{ label: string; entries: Entry[] }> {
  const now = new Date();
  const todayStr = now.toDateString();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayBucket: Entry[] = [];
  const weekBucket: Entry[] = [];
  const monthBucket: Entry[] = [];
  const olderMap = new Map<string, Entry[]>();

  for (const e of entries) {
    const d = new Date(e.closed_at ?? e.created_at);
    if (d.toDateString() === todayStr) {
      todayBucket.push(e);
    } else if (d >= weekAgo) {
      weekBucket.push(e);
    } else if (d >= monthStart) {
      monthBucket.push(e);
    } else {
      const key = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!olderMap.has(key)) olderMap.set(key, []);
      olderMap.get(key)!.push(e);
    }
  }

  const groups: Array<{ label: string; entries: Entry[] }> = [];
  if (todayBucket.length) groups.push({ label: 'Today', entries: todayBucket });
  if (weekBucket.length) groups.push({ label: 'This week', entries: weekBucket });
  if (monthBucket.length) groups.push({ label: 'Earlier this month', entries: monthBucket });
  for (const [label, es] of olderMap) groups.push({ label, entries: es });
  return groups;
}

export function ThreadDetail({
  thread,
  onToggleItem,
  onSendMessage,
  onItemMessage,
  onClose,
  onMic,
  topInset = 50,
  bottomInset = 0,
  embedded = false,
}: {
  thread: Thread;
  onToggleItem: (itemId: string, done: boolean) => Promise<void> | void;
  onSendMessage: (text: string) => void;
  onItemMessage: (itemLabel: string, text: string) => void;
  onClose: () => void;
  onMic: () => void;
  topInset?: number;
  bottomInset?: number;
  embedded?: boolean;
}) {
  const [tab, setTab] = useState<'summary' | 'chat'>('summary');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<Entry | null>(null);

  const theme = threadTheme(thread.tag);

  // Detect ritual template by tag
  const template = TAG_TO_TEMPLATE[thread.tag];

  const patchEntryMeta = usePatchEntryMeta();

  // Live data for ritual threads — entries from the thread record, items+messages
  // from the active entry. For non-ritual (legacy) threads we don't fetch.
  const { thread: liveThread, entries: liveEntries } = useThread(template != null ? thread.id : '');
  const activeEntry = useMemo(
    () => liveEntries.find((e) => e.status === 'active') ?? null,
    [liveEntries],
  );
  const { items: liveActiveItems, messages: liveActiveMessages, refetch: refetchActiveEntry } =
    useEntry(activeEntry?.id ?? '');

  // Locally-mutable copies seeded from the live fetch. Optimistic toggles + sends
  // mutate these; we then refire the parent's API call + refetch the authoritative
  // state. Reset whenever the thread or active entry changes.
  const [localItems, setLocalItems] = useState<EntryItem[]>([]);
  const [localMessages, setLocalMessages] = useState<EntryMessage[]>([]);
  useEffect(() => {
    setLocalItems(liveActiveItems);
  }, [liveActiveItems]);
  useEffect(() => {
    setLocalMessages(liveActiveMessages);
  }, [liveActiveMessages]);

  // Chat-scroll state: which entries have been pulled in, plus a merged
  // messages-by-entry map (so the new ThreadChat can lazy-load older sessions).
  const [loadedEntryIds, setLoadedEntryIds] = useState<string[]>([]);
  const [loadedEntryMessages, setLoadedEntryMessages] = useState<Record<string, EntryMessage[]>>({});
  // Items per closed entry, lazy-loaded when the history sheet opens. Active items
  // come from liveActiveItems / localItems and aren't keyed here.
  const [loadedEntryItems, setLoadedEntryItems] = useState<Record<string, EntryItem[]>>({});
  const [sentCount, setSentCount] = useState(0);

  // Seed the chat scroll with the active entry's messages once they load.
  useEffect(() => {
    if (!activeEntry) return;
    setLoadedEntryIds((prev) => (prev.includes(activeEntry.id) ? prev : [activeEntry.id, ...prev]));
    setLoadedEntryMessages((prev) => ({ ...prev, [activeEntry.id]: liveActiveMessages }));
  }, [activeEntry, liveActiveMessages]);

  // Reset everything when navigating to a different thread.
  useEffect(() => {
    setLoadedEntryIds([]);
    setLoadedEntryMessages({});
    setLoadedEntryItems({});
    setSentCount(0);
  }, [thread.id]);

  const handleRitualToggle = async (itemId: string, done: boolean) => {
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, done } : i)));
    try {
      await onToggleItem(itemId, done);
    } finally {
      refetchActiveEntry();
    }
  };

  const handleRitualSend = (text: string, itemId?: string) => {
    if (itemId) {
      setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, done: true } : i)));
      const msg: EntryMessage = {
        id: `local-${Date.now()}`,
        entry_id: activeEntry?.id ?? '',
        role: 'user',
        text,
        item_ref: itemId,
        meta: {},
        created_at: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, msg]);
      // Find the item label for the per-prompt-composer callback the parent expects.
      const item = localItems.find((i) => i.id === itemId);
      if (item) onItemMessage(item.label, text);
    } else {
      onSendMessage(text);
    }
    setTimeout(() => refetchActiveEntry(), 250);
  };

  const handleSuggestionChoice = (msg: EntryMessage, chipLabel: string) => {
    onSendMessage(chipLabel);
    // Remove the suggestion so the chip row disappears after a choice is made
    setLocalMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setTimeout(() => refetchActiveEntry(), 250);
  };

  const closedEntries = useMemo(
    () => liveEntries.filter((e) => e.status === 'closed'),
    [liveEntries],
  );

  // Pull items + messages for every closed entry the first time the history
  // sheet opens — needed for the "X of Y done" preview on each row.
  useEffect(() => {
    if (!historyOpen) return;
    const missing = closedEntries.filter((e) => !loadedEntryItems[e.id]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map((e) =>
        apiFetch<{ entry: Entry; items: EntryItem[]; messages: EntryMessage[] }>(`/entries/${e.id}`),
      ),
    )
      .then((bundles) => {
        const items: Record<string, EntryItem[]> = {};
        const messages: Record<string, EntryMessage[]> = {};
        bundles.forEach((b) => {
          items[b.entry.id] = b.items;
          messages[b.entry.id] = b.messages;
        });
        setLoadedEntryItems((prev) => ({ ...prev, ...items }));
        setLoadedEntryMessages((prev) => ({ ...prev, ...messages }));
      })
      .catch((e) => console.warn('history-sheet fetch failed', e));
  }, [historyOpen, closedEntries, loadedEntryItems]);

  const chatEntries = useMemo(
    () =>
      liveEntries
        .filter((e) => loadedEntryIds.includes(e.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [liveEntries, loadedEntryIds],
  );

  // Merge optimistic localMessages over the canonical per-entry map so newly-sent
  // user messages appear immediately in the chat scroll.
  const messagesByEntry = useMemo(() => {
    const map: Record<string, EntryMessage[]> = { ...loadedEntryMessages };
    if (activeEntry) {
      const merged = [...(map[activeEntry.id] ?? [])];
      const existing = new Set(merged.map((m) => m.id));
      for (const msg of localMessages) {
        if (!existing.has(msg.id)) merged.push(msg);
      }
      map[activeEntry.id] = merged;
    }
    return map;
  }, [loadedEntryMessages, localMessages, activeEntry]);

  // Live chat-tab badge: total messages across all loaded entries.
  const chatCount = useMemo(
    () => Object.values(messagesByEntry).reduce((sum, msgs) => sum + msgs.length, 0),
    [messagesByEntry],
  );

  const handleChatSend = useCallback(async (text: string, itemRef?: string) => {
    if (!activeEntry) return;
    const msg: EntryMessage = {
      id: `local-${++_localMsgId}`,
      entry_id: activeEntry.id,
      role: 'user',
      text,
      item_ref: itemRef ?? null,
      meta: {},
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, msg]);
    setSentCount((c) => c + 1);
    onSendMessage(text);
    setTimeout(() => refetchActiveEntry(), 250);
  }, [activeEntry, onSendMessage, refetchActiveEntry]);

  const ritualEndedAt = (activeEntry?.meta?.ritual_ended_at as string | undefined) ?? null;

  const handleEndRitual = useCallback(async () => {
    if (!activeEntry) return;

    if (ritualEndedAt) {
      // Undo: clear the flag, stay on the summary tab.
      await patchEntryMeta(activeEntry.id, { ritual_ended_at: null });
      refetchActiveEntry();
      return;
    }

    // End: stamp the flag, then compose the summary message and jump to chat.
    const top3Item = localItems.find((i) => i.label === 'Top 3 Goals for the day');
    const timeblockItem = localItems.find((i) => i.label === 'Time Block for the day');
    const top3Text = top3Item
      ? localMessages.find((m) => m.item_ref === top3Item.id && m.role === 'user')?.text
      : undefined;
    const timeblockText = timeblockItem
      ? localMessages.find((m) => m.item_ref === timeblockItem.id && m.role === 'user')?.text
      : undefined;

    const parts: string[] = ['Morning ritual complete.'];
    if (top3Text) parts.push(`My top 3 for today:\n${top3Text}`);
    if (timeblockText) parts.push(`Time block:\n${timeblockText}`);

    await patchEntryMeta(activeEntry.id, { ritual_ended_at: new Date().toISOString() });
    onSendMessage(parts.join('\n\n'));
    setTab('chat');
    refetchActiveEntry();
  }, [activeEntry, ritualEndedAt, localItems, localMessages, onSendMessage, setTab, patchEntryMeta, refetchActiveEntry]);

  const handleLoadOlderEntry = useCallback(() => {
    const notLoaded = liveEntries
      .map((e) => e.id)
      .filter((id) => !loadedEntryIds.includes(id));
    if (notLoaded.length === 0) return;
    const nextId = notLoaded[0]!;
    apiFetch<{ entry: Entry; items: EntryItem[]; messages: EntryMessage[] }>(`/entries/${nextId}`)
      .then((bundle) => {
        setLoadedEntryIds((prev) => (prev.includes(nextId) ? prev : [...prev, nextId]));
        setLoadedEntryMessages((prev) => ({ ...prev, [nextId]: bundle.messages }));
        setLoadedEntryItems((prev) => ({ ...prev, [nextId]: bundle.items }));
      })
      .catch((e) => console.warn('load-older-entry failed', e));
  }, [liveEntries, loadedEntryIds]);

  const useNewChat = tab === 'chat' && template != null && liveThread != null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: topInset, paddingLeft: 12, paddingRight: 16, paddingBottom: 8,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}
      >
        <View style={{ paddingLeft: 4, paddingRight: 2 }}>
          <SaarthiLogo size={26} />
        </View>
        {!embedded && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onClose}
            style={{ width: 32, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <BackIcon size={22} color={Colors.text} />
          </Pressable>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Hashtag tag={thread.tag} size="xl" />
          <Text style={{ fontSize: 12, color: Colors.textFaint, fontWeight: '500', paddingLeft: 18 }}>
            {subtitleFor(thread)}
          </Text>
        </View>
        {embedded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close thread"
            onPress={onClose}
            style={{
              width: 32, height: 32, borderRadius: 16,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: Colors.bgCard,
              borderColor: Colors.border, borderWidth: 1,
            }}
          >
            <Text style={{ color: Colors.textDim, fontSize: 18, fontWeight: '500', lineHeight: 20 }}>×</Text>
          </Pressable>
        ) : template != null ? (
          // Ritual threads: gear opens history sheet
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entry history"
            onPress={() => setHistoryOpen(true)}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <DotsIcon size={20} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More options"
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <DotsIcon size={20} />
          </Pressable>
        )}
      </View>

      {/* Tab switcher */}
      <View
        style={{
          marginHorizontal: 16, marginTop: 6, marginBottom: 10,
          padding: 3,
          backgroundColor: Colors.bgCard,
          borderColor: Colors.border, borderWidth: 1, borderRadius: 12,
          flexDirection: 'row', gap: 2,
        }}
      >
        {(['summary', 'chat'] as const).map((id) => {
          const isA = tab === id;
          // TODO(#007): fold `kind` into template; note threads should register as template: 'note'
          const label = id === 'summary' ? (thread.kind === 'note' ? 'Note' : 'Summary') : 'Chat';
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isA }}
              onPress={() => setTab(id)}
              style={{
                flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                backgroundColor: isA ? Colors.bgCardElev : 'transparent',
                alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
                gap: 6,
              }}
            >
              <Text style={{ color: isA ? Colors.text : Colors.textDim, fontSize: 13, fontWeight: '600' }}>
                {label}
              </Text>
              {id === 'chat' && (
                <View
                  style={{
                    paddingVertical: 1, paddingHorizontal: 6, borderRadius: 999,
                    backgroundColor: isA ? theme.dim : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Text style={{ fontSize: 10, color: isA ? theme.color : Colors.textFaint, fontWeight: '700' }}>
                    {chatCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {useNewChat && liveThread ? (
        <ThreadChat
          thread={liveThread}
          entries={chatEntries}
          messagesByEntry={messagesByEntry}
          onSend={handleChatSend}
          onLoadOlderEntry={handleLoadOlderEntry}
          onMic={onMic}
          bottomInset={bottomInset}
          sentCount={sentCount}
        />
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 170 }}
            keyboardShouldPersistTaps="handled"
          >
            {tab === 'summary'
              ? renderSummary(
                  thread,
                  template,
                  activeEntry,
                  localItems,
                  localMessages,
                  handleRitualToggle,
                  handleRitualSend,
                  handleSuggestionChoice,
                  // Legacy summaries (non-ritual threads) call with just the id —
                  // bridge to the new (id, done) shape by looking up current state.
                  (id: string) => {
                    const current = thread.items.find((i) => i.id === id);
                    if (current) onToggleItem(id, !current.done);
                  },
                  () => setTab('chat'),
                  onItemMessage,
                  template === 'morning_ritual' ? handleEndRitual : undefined,
                  template === 'evening_ritual'
                    ? (activeEntry?.meta?.morning_top3 as string | undefined)
                    : undefined,
                )
              : <ThreadChatTab thread={thread} />}
          </ScrollView>

          {/* Composer */}
          <Composer
            accent={theme.color}
            hashtag={thread.tag}
            placeholder={tab === 'summary' ? `add to ${thread.tag}…` : 'Message Saarthi…'}
            paddingBottom={Math.max(bottomInset, 12) + 16}
            onSend={onSendMessage}
            onMic={onMic}
          />
        </>
      )}

      {/* History sheet — only for ritual threads */}
      {template != null && (
        <>
          <Modal
            visible={historyOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setHistoryOpen(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
              <View
                style={{
                  backgroundColor: Colors.bg,
                  borderTopLeftRadius: 20, borderTopRightRadius: 20,
                  maxHeight: '75%',
                  borderTopColor: Colors.border, borderTopWidth: 1,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
                    borderBottomColor: Colors.border, borderBottomWidth: 1,
                  }}
                >
                  <Text style={{ flex: 1, color: Colors.text, fontSize: 16, fontWeight: '700' }}>
                    Entry History
                  </Text>
                  <Pressable
                    onPress={() => setHistoryOpen(false)}
                    style={{ paddingHorizontal: 4 }}
                  >
                    <Text style={{ color: Colors.accent, fontSize: 15, fontWeight: '600' }}>Done</Text>
                  </Pressable>
                </View>
                <ScrollView>
                  {closedEntries.length === 0 ? (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                      <Text style={{ color: Colors.textFaint, fontSize: 13 }}>No past entries yet.</Text>
                    </View>
                  ) : (
                    groupEntriesByDate(closedEntries).map((group) => (
                      <View key={group.label}>
                        <Text
                          style={{
                            paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
                            fontSize: 11, color: Colors.textFaint,
                            fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
                          }}
                        >
                          {group.label}
                        </Text>
                        {group.entries.map((entry) => {
                          const entryItems = loadedEntryItems[entry.id] ?? [];
                          const doneCount = entryItems.filter((i) => i.done).length;
                          return (
                            <Pressable
                              key={entry.id}
                              onPress={() => {
                                setHistoryOpen(false);
                                // Wait for the dismiss slide animation before opening the preview
                                // so both modals don't animate simultaneously (visually jarring).
                                setTimeout(() => setPreviewEntry(entry), 350);
                              }}
                              style={{
                                flexDirection: 'row', alignItems: 'center',
                                paddingVertical: 13, paddingHorizontal: 16,
                                borderBottomColor: Colors.border, borderBottomWidth: 1,
                              }}
                            >
                              <View style={{ flex: 1, gap: 2 }}>
                                <Text style={{ color: Colors.text, fontSize: 14, fontWeight: '500' }}>
                                  {entry.label ?? 'Entry'}
                                </Text>
                                <Text style={{ color: Colors.textDim, fontSize: 12 }}>
                                  {doneCount} of {entryItems.length} done
                                </Text>
                              </View>
                              <ChevRightIcon size={16} />
                            </Pressable>
                          );
                        })}
                      </View>
                    ))
                  )}
                  <View style={{ height: 40 }} />
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Frozen SummaryView for a closed entry */}
          <Modal
            visible={previewEntry != null}
            animationType="slide"
            onRequestClose={() => setPreviewEntry(null)}
          >
            <View style={{ flex: 1, backgroundColor: Colors.bg }}>
              <View
                style={{
                  paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 12,
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  borderBottomColor: Colors.border, borderBottomWidth: 1,
                }}
              >
                <Pressable
                  onPress={() => setPreviewEntry(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  style={{ width: 32, height: 36, alignItems: 'center', justifyContent: 'center' }}
                >
                  <BackIcon size={22} color={Colors.text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '700' }}>
                    {previewEntry?.label ?? 'Past Entry'}
                  </Text>
                  <Text style={{ color: Colors.textFaint, fontSize: 12, marginTop: 1 }}>read-only</Text>
                </View>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {previewEntry && template != null && (() => {
                  const { SummaryView } = TEMPLATE_REGISTRY[template];
                  const entryItems = loadedEntryItems[previewEntry.id] ?? [];
                  const entryMessages = loadedEntryMessages[previewEntry.id] ?? [];
                  return (
                    <SummaryView
                      entry={previewEntry}
                      items={entryItems}
                      messages={entryMessages}
                      readOnly
                    />
                  );
                })()}
              </ScrollView>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

function renderSummary(
  thread: Thread,
  template: ThreadTemplate | undefined,
  activeEntry: Entry | null | undefined,
  localItems: EntryItem[],
  localMessages: EntryMessage[],
  onRitualToggle: (itemId: string, done: boolean) => void,
  onRitualSend: (text: string, itemId?: string) => void,
  onSuggestionChoice: (msg: EntryMessage, chip: string) => void,
  toggleItem: (id: string) => void,
  openChat: () => void,
  itemMessage: (itemLabel: string, text: string) => void,
  onEndRitual?: () => void,
  morningTop3?: string,
) {
  // Ritual thread — dispatch via TEMPLATE_REGISTRY
  if (template != null && activeEntry != null) {
    const { SummaryView } = TEMPLATE_REGISTRY[template];
    return (
      <SummaryView
        entry={activeEntry}
        items={localItems}
        messages={localMessages}
        onToggle={onRitualToggle}
        onSendMessage={onRitualSend}
        onSuggestionChoice={onSuggestionChoice}
        onEndRitual={onEndRitual}
        morningTop3={morningTop3}
      />
    );
  }

  // Legacy thread kinds — TODO: migrate each to a template as they get bespoke summaries
  switch (thread.kind) {
    case 'checklist':
      return <MorningSummary thread={thread} onItemToggle={toggleItem} onItemChat={openChat} />;
    case 'focus':
    case 'focus-title':
    case 'workout':
    case 'food':
    case 'evening':
    case 'fitness':
      return <FocusSummary thread={thread} onItemToggle={toggleItem} onItemMessage={itemMessage} />;
    case 'note':
      return <NoteSummary thread={thread} />;
    default: {
      const _exhaustive: never = thread.kind;
      return null;
    }
  }
}
