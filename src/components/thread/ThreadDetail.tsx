import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { liveMessageCount, subtitleFor, THREAD_CHATS, type Thread } from '@/lib/mockData';
import { Composer } from '../Composer';
import { Hashtag } from '../Hashtag';
import { BackIcon, DotsIcon } from '../icons';
import { SaarthiLogo } from '../SaarthiLogo';
import { FocusSummary } from './FocusSummary';
import { MorningSummary } from './MorningSummary';
import { NoteSummary } from './NoteSummary';
import { ThreadChatTab } from './ThreadChatTab';

export function ThreadDetail({
  thread,
  onToggleItem,
  onSendMessage,
  onItemMessage,
  onClose,
  onMic,
  topInset = 50,
  /** Pixels reserved below the composer (safe-area home indicator); 0 in embedded panes. */
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
  const theme = threadTheme(thread.tag);

  // Shared with ChatHistoryView's active-strip count so the two surfaces never drift.
  const chatCount = liveMessageCount(thread, THREAD_CHATS);

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
        {/* Embedded mode (iPad/web master-detail) needs a way back to the EmptyDetail state.
            The dots slot is unused, so reuse it as the close affordance there. */}
        {embedded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close thread"
            onPress={onClose}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: Colors.textDim, fontSize: 22, fontWeight: '300' }}>×</Text>
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
          ? renderSummary(thread, onToggleItem, () => setTab('chat'), onItemMessage)
          : <ThreadChatTab thread={thread} />}
      </ScrollView>

      {/* Composer — bottom padding tracks the safe-area inset directly; the phone tab bar
          is hidden when the detail is open so no extra reservation is needed. */}
      <Composer
        accent={theme.color}
        hashtag={thread.tag}
        placeholder={tab === 'summary' ? `add to ${thread.tag}…` : 'Message Saarthi…'}
        paddingBottom={Math.max(bottomInset, 12) + 16}
        onSend={onSendMessage}
        onMic={onMic}
      />
    </View>
  );
}

function renderSummary(
  thread: Thread,
  toggleItem: (id: string) => void,
  openChat: () => void,
  itemMessage: (itemLabel: string, text: string) => void,
) {
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
      return <FocusSummary thread={thread} onItemToggle={toggleItem} onItemMessage={itemMessage} />;
    case 'note':
      return <NoteSummary thread={thread} />;
    default: {
      const _exhaustive: never = thread.kind;
      return null;
    }
  }
}
