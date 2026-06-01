import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { THREAD_CHATS, TODAY_THREADS, type Thread } from '@/lib/mockData';
import { Composer } from '../Composer';
import { Hashtag } from '../Hashtag';
import { BackIcon, DotsIcon } from '../icons';
import { SaarthiLogo } from '../SaarthiLogo';
import { FocusSummary } from './FocusSummary';
import { MorningSummary } from './MorningSummary';
import { NoteSummary } from './NoteSummary';
import { ThreadChatTab } from './ThreadChatTab';

function renderSummary(thread: Thread, toggleItem: (id: string) => void, openChat: () => void) {
  switch (thread.kind) {
    case 'checklist':
      return <MorningSummary thread={thread} onItemToggle={toggleItem} onItemChat={openChat} />;
    case 'focus':
    case 'focus-title':
    case 'workout':
    case 'food':
    case 'evening':
    case 'fitness':
      // Fitness/evening reuse the focus layout until they get bespoke summaries — the prototype's
      // FitnessSummary (activity rings, metric grid) isn't ported in this PR.
      return <FocusSummary thread={thread} onItemToggle={toggleItem} />;
    case 'note':
      return <NoteSummary thread={thread} />;
    default: {
      const _exhaustive: never = thread.kind;
      return null;
    }
  }
}

export function ThreadDetail({
  threadId,
  customThreads = [],
  onClose,
  onMic,
  topInset = 50,
  embedded = false,
}: {
  threadId: string;
  customThreads?: Thread[];
  onClose: () => void;
  onMic: () => void;
  topInset?: number;
  embedded?: boolean;
}) {
  const initial = useMemo(() => {
    return [...TODAY_THREADS, ...customThreads].find((t) => t.id === threadId);
  }, [threadId, customThreads]);

  const [thread, setThread] = useState<Thread | undefined>(initial);
  const [tab, setTab] = useState<'summary' | 'chat'>('summary');

  if (!thread) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textDim }}>Thread not found</Text>
      </View>
    );
  }

  const theme = threadTheme(thread.tag);

  const toggleItem = (itemId: string) => {
    setThread((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
          }
        : prev
    );
  };

  const chatCount =
    thread.kind === 'note' ? (thread.messages || []).length : (THREAD_CHATS[thread.id] || []).length;

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
          <Pressable onPress={onClose} style={{ width: 32, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <BackIcon size={22} color={Colors.text} />
          </Pressable>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Hashtag tag={thread.tag} size="xl" />
          <Text style={{ fontSize: 12, color: Colors.textFaint, fontWeight: '500', paddingLeft: 18 }}>
            {thread.subtitle}
          </Text>
        </View>
        <Pressable style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <DotsIcon size={20} />
        </Pressable>
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
          const label = id === 'summary' ? (thread.kind === 'note' ? 'Note' : 'Summary') : 'Chat';
          return (
            <Pressable
              key={id}
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 170 }}>
        {tab === 'summary'
          ? renderSummary(thread, toggleItem, () => setTab('chat'))
          : <ThreadChatTab thread={thread} />}
      </ScrollView>

      {/* Composer */}
      <Composer
        accent={theme.color}
        hashtag={thread.tag}
        placeholder={tab === 'summary' ? `add to ${thread.tag}…` : 'Message Saarthi…'}
        paddingBottom={embedded ? 28 : 92}
        onMic={onMic}
      />
    </View>
  );
}
