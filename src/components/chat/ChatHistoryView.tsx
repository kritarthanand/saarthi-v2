import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { HISTORY_DAYS, THREAD_CHATS, TODAY_THREADS } from '@/lib/mockData';
import { AppHeader } from '../AppHeader';
import { ChevRightIcon } from '../icons';

export function ChatHistoryView({
  onOpenThread,
  topInset = 52,
}: {
  onOpenThread: (id: string) => void;
  topInset?: number;
}) {
  const [count, setCount] = useState(5);
  // Gate the loader so a single fling at the bottom can't burn through all pages —
  // `scrollEventThrottle` still fires several times/s while held.
  const loadingRef = useRef(false);
  const days = HISTORY_DAYS.slice(0, count);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (loadingRef.current) return;
    if (count >= HISTORY_DAYS.length) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (contentSize.height - contentOffset.y - layoutMeasurement.height < 200) {
      loadingRef.current = true;
      setCount((c) => Math.min(c + 2, HISTORY_DAYS.length));
      setTimeout(() => {
        loadingRef.current = false;
      }, 400);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{ paddingBottom: 110 }}
      onScroll={handleScroll}
      scrollEventThrottle={200}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title="Chat" right="all threads" topInset={topInset} />

      {/* Active strip */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text
          style={{
            fontSize: 10.5, color: Colors.textFaint, fontWeight: '700',
            letterSpacing: 1, textTransform: 'uppercase',
            paddingHorizontal: 4, paddingBottom: 8,
          }}
        >
          active now
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TODAY_THREADS.map((t) => {
            const theme = threadTheme(t.tag);
            return (
              <Pressable
                key={t.id}
                onPress={() => onOpenThread(t.id)}
                style={{
                  paddingVertical: 8, paddingHorizontal: 12,
                  backgroundColor: theme.dim,
                  borderColor: theme.color + '30', borderWidth: 1,
                  borderRadius: 12, minWidth: 130, gap: 2,
                }}
              >
                <Text style={{ fontSize: 13, color: theme.color, fontWeight: '700' }}>{t.tag}</Text>
                <Text style={{ fontSize: 10.5, color: Colors.textDim, fontWeight: '500' }}>
                  {(THREAD_CHATS[t.id] || []).length} messages
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Day groups */}
      <View style={{ paddingHorizontal: 16, gap: 18 }}>
        {days.map((day, di) => (
          <View key={di} style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row', alignItems: 'flex-end',
                justifyContent: 'space-between', paddingHorizontal: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: Colors.text, fontWeight: '700' }}>{day.label}</Text>
              {day.date ? (
                <Text style={{ fontSize: 11.5, color: Colors.textFaint, fontWeight: '500' }}>{day.date}</Text>
              ) : null}
            </View>
            <View
              style={{
                backgroundColor: Colors.bgCard,
                borderColor: Colors.border, borderWidth: 1,
                borderRadius: 16, overflow: 'hidden',
              }}
            >
              {day.threads.map((th, ti) => {
                const theme = threadTheme(th.tag);
                // History rows are routable only when they carry a `threadId`. Avoid `.find(tag)` —
                // tags aren't unique (e.g. two #FocusAndToDo threads today).
                const routable = th.threadId && TODAY_THREADS.some((t) => t.id === th.threadId);
                return (
                  <Pressable
                    key={ti}
                    onPress={routable && th.threadId ? () => onOpenThread(th.threadId!) : undefined}
                    style={{
                      paddingVertical: 12, paddingHorizontal: 14,
                      borderBottomWidth: ti < day.threads.length - 1 ? 1 : 0,
                      borderBottomColor: Colors.border,
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View
                        style={{
                          flexDirection: 'row', alignItems: 'flex-end',
                          justifyContent: 'space-between', gap: 8,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: theme.color, fontWeight: '700' }}>{th.tag}</Text>
                        <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '500' }}>{th.time}</Text>
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 12.5, color: Colors.textDim, fontWeight: '500' }}>
                        {th.preview}
                      </Text>
                    </View>
                    {routable && <ChevRightIcon size={14} color={Colors.textFaint} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        {count < HISTORY_DAYS.length ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: Colors.textFaint, fontSize: 12, fontWeight: '500' }}>scroll to load more</Text>
          </View>
        ) : (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <Text
              style={{
                color: Colors.textFaint, fontSize: 11, fontWeight: '500',
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              ✦ that&apos;s everything
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
