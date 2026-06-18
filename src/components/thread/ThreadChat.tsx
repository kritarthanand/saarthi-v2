import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { Task, Thread, ThreadMessage } from '@/lib/threads';
import { Composer } from '../Composer';

export type ThreadChatProps = {
  thread: Thread;
  tasks?: Task[];
  messages: ThreadMessage[];
  onSend: (text: string, taskRef?: string) => Promise<void>;
  onMic?: () => void;
  bottomInset?: number;
  readOnly?: boolean;
  /**
   * Incremented by the parent each time the user sends a message. Driving
   * scroll-to-bottom off this (rather than messages) ensures history
   * loads — which also mutate messages — don't snap the user back to
   * the bottom while they're browsing.
   */
  sentCount?: number;
  /** When true, render a "Saarthi is typing…" indicator below the last bubble. */
  aiTyping?: boolean;
  pendingComposerText?: string;
  onPendingComposerTextConsumed?: () => void;
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ThreadChat({
  thread,
  tasks = [],
  messages,
  onSend,
  onMic,
  bottomInset = 0,
  readOnly = false,
  sentCount = 0,
  aiTyping = false,
  pendingComposerText,
  onPendingComposerTextConsumed,
}: ThreadChatProps) {
  const theme = threadTheme(thread.tag);
  const scrollRef = useRef<ScrollView>(null);

  // Scroll to bottom on mount (sentCount=0) and whenever the user sends a message.
  // Deliberately NOT keyed on messages so that loading older history
  // doesn't snap the user back to the bottom while they're browsing.
  useEffect(() => {
    const animated = sentCount > 0;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated });
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentCount]);

  const tagSlug = useMemo(() => thread.tag.replace('#', '').toLowerCase(), [thread.tag]);

  const composerPaddingBottom = Math.max(bottomInset, 12) + 16;
  // Composer bar ≈ 56px (paddingTop 12 + input row 44) + composerPaddingBottom + breathing room
  const scrollContentPaddingBottom = composerPaddingBottom + 80;

  const handleSend = useCallback(
    (text: string) => {
      onSend(text).catch(console.error);
    },
    [onSend],
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: scrollContentPaddingBottom,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => {
          const timeLabel = fmtTime(msg.created_at);
          const metaTag =
            typeof msg.meta?.tag === 'string' ? msg.meta.tag : null;
          const referencedTask = msg.task_ref ? tasks.find((t) => t.id === msg.task_ref) : undefined;

          if (msg.role === 'ai') {
            return (
              <View
                key={msg.id}
                style={{ alignItems: 'flex-start', maxWidth: '88%', gap: 4 }}
              >
                <Text style={{ fontSize: 14.5, color: Colors.text, lineHeight: 20 }}>
                  {msg.content}
                </Text>
                <Text style={{ fontSize: 10.5, color: Colors.textFaint, fontWeight: '500' }}>
                  {metaTag ?? tagSlug} · {timeLabel}
                </Text>
              </View>
            );
          }

          return (
            <View
              key={msg.id}
              style={{
                alignSelf: 'flex-end',
                maxWidth: '78%',
                gap: 4,
                alignItems: 'flex-end',
              }}
            >
              {msg.task_ref && (
                <View
                  style={{
                    paddingVertical: 2,
                    paddingHorizontal: 8,
                    borderRadius: 999,
                    backgroundColor: theme.dim,
                    maxWidth: '100%',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 10.5,
                      color: theme.color,
                      fontWeight: '700',
                      letterSpacing: 0.2,
                    }}
                  >
                    re: {referencedTask?.title ?? '(task)'}
                  </Text>
                </View>
              )}
              <View
                style={{
                  backgroundColor: theme.color,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  borderBottomRightRadius: 4,
                  gap: 2,
                  alignItems: 'flex-end',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '500' }}>
                  {msg.content}
                </Text>
                <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                  {timeLabel}
                </Text>
              </View>
            </View>
          );
        })}
        {aiTyping && (
          <View
            accessibilityLabel="Saarthi is typing"
            style={{ alignItems: 'flex-start', maxWidth: '88%', gap: 4 }}
          >
            <Text style={{ fontSize: 13, color: Colors.textFaint, fontStyle: 'italic' }}>
              Saarthi is typing…
            </Text>
          </View>
        )}
      </ScrollView>

      <Composer
        accent={theme.color}
        hashtag={thread.tag}
        placeholder="Message Saarthi…"
        paddingBottom={composerPaddingBottom}
        onSend={handleSend}
        onMic={onMic}
        pendingText={pendingComposerText}
        onPendingTextConsumed={onPendingComposerTextConsumed}
      />
    </View>
  );
}
