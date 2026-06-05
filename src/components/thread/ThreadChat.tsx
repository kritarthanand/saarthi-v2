import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { ThreadTemplate } from '@/lib/threads';
import type { Entry, EntryMessage, Thread } from '@/lib/threads';
import { Composer } from '../Composer';

export type ThreadChatProps = {
  thread: Thread;
  /** Sorted newest-first. Only entries present in messagesByEntry are rendered. */
  entries: Entry[];
  messagesByEntry: Record<string, EntryMessage[]>;
  onSend: (text: string, itemRef?: string) => Promise<void>;
  onLoadOlderEntry?: () => void;
  onMic?: () => void;
  bottomInset?: number;
  /**
   * Incremented by the parent each time the user sends a message. Driving
   * scroll-to-bottom off this (rather than messagesByEntry) ensures history
   * loads — which also mutate messagesByEntry — don't snap the user back to
   * the bottom while they're browsing older entries.
   */
  sentCount?: number;
};

function defaultPillLabel(template: ThreadTemplate): string {
  switch (template) {
    case ThreadTemplate.MorningRitual: return 'MORNINGRITUAL SESSION';
    case ThreadTemplate.EveningRitual: return 'EVENINGRITUAL SESSION';
    case ThreadTemplate.WeeklyRitual:  return 'WEEKLYRITUAL SESSION';
    default: {
      const _: never = template;
      return String(template).toUpperCase() + ' SESSION';
    }
  }
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

type ListItem =
  | { type: 'pill'; entry: Entry }
  | { type: 'message'; msg: EntryMessage };

export function ThreadChat({
  thread,
  entries,
  messagesByEntry,
  onSend,
  onLoadOlderEntry,
  onMic,
  bottomInset = 0,
  sentCount = 0,
}: ThreadChatProps) {
  const theme = threadTheme(thread.tag);
  const scrollRef = useRef<ScrollView>(null);
  // Prevent onLoadOlderEntry from firing repeatedly while at the top
  const loadTriggeredRef = useRef(false);

  // Reset the load trigger whenever new entries are added
  const entryCount = entries.length;
  useEffect(() => {
    loadTriggeredRef.current = false;
  }, [entryCount]);

  // Scroll to bottom on mount (sentCount=0) and whenever the user sends a message.
  // Deliberately NOT keyed on messagesByEntry so that loading older history
  // doesn't snap the user back to the bottom while they're browsing.
  useEffect(() => {
    const animated = sentCount > 0;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated });
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentCount]);

  // entries are newest-first; flip to oldest-first for display (chat order: old → new)
  const items = useMemo<ListItem[]>(() => {
    const result: ListItem[] = [];
    const sorted = [...entries].reverse();
    for (const entry of sorted) {
      const messages = messagesByEntry[entry.id];
      if (!messages) continue; // skip entries not yet loaded
      result.push({ type: 'pill', entry });
      for (const msg of messages) {
        result.push({ type: 'message', msg });
      }
    }
    return result;
  }, [entries, messagesByEntry]);

  const pillLabel = useCallback(
    (entry: Entry) =>
      entry.label ? entry.label.toUpperCase() : defaultPillLabel(thread.template),
    [thread.template],
  );

  const handleScroll = useCallback(
    ({ nativeEvent }: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (
        nativeEvent.contentOffset.y < 60 &&
        !loadTriggeredRef.current &&
        onLoadOlderEntry
      ) {
        loadTriggeredRef.current = true;
        onLoadOlderEntry();
      }
    },
    [onLoadOlderEntry],
  );

  const composerPaddingBottom = Math.max(bottomInset, 12) + 16;
  // Composer bar ≈ 56px (paddingTop 12 + input row 44) + composerPaddingBottom + breathing room
  const scrollContentPaddingBottom = composerPaddingBottom + 80;

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
        onScroll={handleScroll}
        scrollEventThrottle={100}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => {
          if (item.type === 'pill') {
            return (
              <View
                key={`pill-${item.entry.id}`}
                style={{
                  alignSelf: 'center',
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: theme.dim,
                  marginBottom: 2,
                }}
              >
                <Text
                  style={{
                    color: theme.color,
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {pillLabel(item.entry)}
                </Text>
              </View>
            );
          }

          const { msg } = item;
          const timeLabel = fmtTime(msg.created_at);
          const metaTag =
            typeof msg.meta?.tag === 'string' ? msg.meta.tag : null;
          const tagSlug = thread.tag.replace('#', '').toLowerCase();

          if (msg.role === 'ai') {
            return (
              <View
                key={msg.id}
                style={{ alignItems: 'flex-start', maxWidth: '88%', gap: 4 }}
              >
                <Text style={{ fontSize: 14.5, color: Colors.text, lineHeight: 20 }}>
                  {msg.text}
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
              {msg.item_ref && (
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
                    re: {msg.item_ref}
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
                  {msg.text}
                </Text>
                <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                  {timeLabel}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Composer
        accent={theme.color}
        hashtag={thread.tag}
        placeholder="Message Saarthi…"
        paddingBottom={composerPaddingBottom}
        onSend={(text) => {
          onSend(text).catch(console.error);
        }}
        onMic={onMic}
      />
    </View>
  );
}
