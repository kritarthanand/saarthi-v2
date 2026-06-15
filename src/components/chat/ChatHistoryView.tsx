import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import {
  HISTORY_DAYS,
  type HistoryDay,
} from '@/lib/mockData';
import { AppHeader } from '../AppHeader';
import { ChevRightIcon } from '../icons';

// Minimal shape accepted from both the new Thread (threads.ts) and legacy mock Thread
type ThreadRef = { id: string; tag: string };

const PAGE = 5;

export function ChatHistoryView({
  threads,
  onOpenThread,
  onNew,
  topInset = 52,
}: {
  threads: ThreadRef[];
  onOpenThread: (id: string) => void;
  onNew?: () => void;
  topInset?: number;
}) {
  const [count, setCount] = useState(PAGE);
  const data = HISTORY_DAYS.slice(0, count);

  const loadMore = useCallback(() => {
    setCount((c) => Math.min(c + 2, HISTORY_DAYS.length));
  }, []);

  // Dedupe by tag so two threads with the same tag don't render as identical chips.
  const activeThreads = useMemo(() => {
    const seen = new Map<string, ThreadRef>();
    for (const t of threads) {
      if (!seen.has(t.tag)) seen.set(t.tag, t);
    }
    return [...seen.values()];
  }, [threads]);

  const renderHeader = () => (
    <View>
      <AppHeader
        title="Chat"
        topInset={topInset}
        right={
          onNew ? (
            <Pressable
              onPress={onNew}
              accessibilityRole="button"
              accessibilityLabel="New thread"
              style={styles.newBtn}
            >
              <Text style={styles.newBtnText}>+</Text>
            </Pressable>
          ) : 'all threads'
        }
      />
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          {activeThreads.map((t) => {
            const theme = threadTheme(t.tag);
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${t.tag} thread`}
                onPress={() => onOpenThread(t.id)}
                style={{
                  paddingVertical: 8, paddingHorizontal: 12,
                  backgroundColor: theme.dim,
                  borderColor: theme.color + '30', borderWidth: 1,
                  borderRadius: 12, minWidth: 130, gap: 2,
                }}
              >
                <Text style={{ fontSize: 13, color: theme.color, fontWeight: '700' }}>{t.tag}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (count < HISTORY_DAYS.length) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: Colors.textFaint, fontSize: 12, fontWeight: '500' }}>loading more…</Text>
        </View>
      );
    }
    return (
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
    );
  };

  const renderDay = ({ item: day }: { item: HistoryDay }) => (
    <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 }}>
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
          const routable = !!th.threadId && threads.some((t) => t.id === th.threadId);
          const rowStyle = {
            paddingVertical: 12, paddingHorizontal: 14,
            borderBottomWidth: ti < day.threads.length - 1 ? 1 : 0,
            borderBottomColor: Colors.border,
            flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12,
          };
          // Inner row key prefers stable threadId; falls back to tag+time to remain
          // unique within a day. Using `ti` would re-key everything when a row inserts.
          const rowKey = th.threadId ?? `${th.tag}@${th.time}`;
          const rowContents = (
            <>
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
            </>
          );
          return routable ? (
            <Pressable
              key={rowKey}
              accessibilityRole="button"
              accessibilityLabel={`Open ${th.tag} from ${day.label}`}
              onPress={() => onOpenThread(th.threadId!)}
              style={rowStyle}
            >
              {rowContents}
            </Pressable>
          ) : (
            <View key={rowKey} style={rowStyle}>{rowContents}</View>
          );
        })}
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{ paddingBottom: 110 }}
      data={data}
      keyExtractor={(d) => `${d.label}|${d.date}`}
      renderItem={renderDay}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  newBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  newBtnText: {
    fontSize: 20, color: Colors.text, lineHeight: 24, fontWeight: '300',
  },
});
