import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { liveMessageCount, subtitleFor, THREAD_CHATS, type Thread } from '@/lib/mockData';
import { TAG_TO_TEMPLATE, TEMPLATE_REGISTRY } from '@/lib/threadTemplates';
import { getFixtureBundle } from '@/lib/threads.fixture';
import type { Entry, EntryItem, EntryMessage, ThreadTemplate } from '@/lib/threads';
import { Composer } from '../Composer';
import { Hashtag } from '../Hashtag';
import { BackIcon, ChevRightIcon, DotsIcon } from '../icons';
import { SaarthiLogo } from '../SaarthiLogo';
import { FocusSummary } from './FocusSummary';
import { MorningSummary } from './MorningSummary';
import { NoteSummary } from './NoteSummary';
import { ThreadChatTab } from './ThreadChatTab';

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
  onToggleItem: (itemId: string) => void;
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
  const chatCount = liveMessageCount(thread, THREAD_CHATS);

  // Detect ritual template by tag
  const template = TAG_TO_TEMPLATE[thread.tag];
  const fixtureBundle = template != null ? getFixtureBundle(thread.tag) : null;
  const activeFixtureEntry = fixtureBundle?.entries.find((e) => e.status === 'active') ?? null;

  // Local mutable state for ritual thread items and messages
  const [localItems, setLocalItems] = useState<EntryItem[]>(() => {
    if (!fixtureBundle || !activeFixtureEntry) return [];
    return fixtureBundle.items.filter((i) => i.entry_id === activeFixtureEntry.id);
  });
  const [localMessages, setLocalMessages] = useState<EntryMessage[]>(() => {
    if (!fixtureBundle || !activeFixtureEntry) return [];
    return fixtureBundle.messages.filter((m) => m.entry_id === activeFixtureEntry.id);
  });

  const handleRitualToggle = (itemId: string, done: boolean) => {
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, done } : i)));
  };

  const handleRitualSend = (text: string, itemId?: string) => {
    if (itemId) {
      setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, done: true } : i)));
      const msg: EntryMessage = {
        id: `local-${Date.now()}`,
        entry_id: activeFixtureEntry?.id ?? '',
        role: 'user',
        text,
        item_ref: itemId,
        meta: {},
        created_at: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, msg]);
    }
    onSendMessage(text);
  };

  const handleSuggestionChoice = (_msg: EntryMessage, chipLabel: string) => {
    onSendMessage(chipLabel);
  };

  const closedEntries = fixtureBundle?.entries.filter((e) => e.status === 'closed') ?? [];

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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 170 }}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'summary'
          ? renderSummary(
              thread,
              template,
              activeFixtureEntry,
              localItems,
              localMessages,
              handleRitualToggle,
              handleRitualSend,
              handleSuggestionChoice,
              onToggleItem,
              () => setTab('chat'),
              onItemMessage,
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

      {/* History sheet */}
      {fixtureBundle && (
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
                          const entryItems = fixtureBundle.items.filter((i) => i.entry_id === entry.id);
                          const doneCount = entryItems.filter((i) => i.done).length;
                          return (
                            <Pressable
                              key={entry.id}
                              onPress={() => {
                                setHistoryOpen(false);
                                setPreviewEntry(entry);
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
                  const entryItems = fixtureBundle.items.filter((i) => i.entry_id === previewEntry.id);
                  return (
                    <SummaryView
                      entry={previewEntry}
                      items={entryItems}
                      messages={[]}
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
