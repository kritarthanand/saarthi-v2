import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import type { Thread } from '@/lib/threads';
import { useThreads } from '@/lib/threads.hooks';
import { AppHeader } from '../AppHeader';
import { ChevRightIcon } from '../icons';

const PAGE = 5;

type DayGroup = {
  label: string;
  dateKey: string;
  threads: Thread[];
};

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Returns a YYYY-MM-DD key adjusted for day_start_hour.
// If a thread was created before the day starts (e.g. 4 AM when day starts at 5 AM),
// it belongs to the previous calendar day.
function userDayKey(isoString: string, dayStartHour: number): string {
  const d = new Date(isoString);
  if (d.getHours() < dayStartHour) {
    d.setDate(d.getDate() - 1);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function userTodayKey(dayStartHour: number): string {
  return userDayKey(new Date().toISOString(), dayStartHour);
}

function userYesterdayKey(dayStartHour: number): string {
  return userDayKey(new Date(Date.now() - 86400000).toISOString(), dayStartHour);
}

function dayLabel(dateKey: string, dayStartHour: number): string {
  if (dateKey === userTodayKey(dayStartHour)) return 'Today';
  if (dateKey === userYesterdayKey(dayStartHour)) return 'Yesterday';
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function threadPreview(t: Thread): string {
  if (t.last_message_preview) return t.last_message_preview;
  if (t.task_count > 0) return `${t.done_count} of ${t.task_count} done`;
  return t.title || t.template.replace(/_/g, ' ');
}

function groupByDay(threads: Thread[], dayStartHour: number): DayGroup[] {
  const map = new Map<string, Thread[]>();
  const sorted = [...threads].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  for (const t of sorted) {
    const key = userDayKey(t.created_at, dayStartHour);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()].map(([dateKey, ts]) => ({
    dateKey,
    label: dayLabel(dateKey, dayStartHour),
    threads: ts,
  }));
}

export function ChatHistoryView({
  activeThreads = [],
  onOpenThread,
  onNew,
  topInset = 52,
}: {
  activeThreads?: Thread[];
  onOpenThread: (id: string) => void;
  onNew?: () => void;
  topInset?: number;
}) {
  const [count, setCount] = useState(PAGE);
  const { threads: allThreads, loading, error } = useThreads();
  const { profile } = useProfile();
  const dayStartHour = profile.day_start_hour;

  const days = useMemo(() => groupByDay(allThreads, dayStartHour), [allThreads, dayStartHour]);
  const data = days.slice(0, count);

  const loadMore = useCallback(() => {
    setCount((c) => Math.min(c + 2, days.length));
  }, [days.length]);

  const activeChips = useMemo(() => {
    const seen = new Map<string, Thread>();
    for (const t of activeThreads) {
      if (!seen.has(t.tag)) seen.set(t.tag, t);
    }
    return [...seen.values()];
  }, [activeThreads]);

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
      {activeChips.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={styles.sectionLabel}>active now</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {activeChips.map((t) => {
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
      )}
    </View>
  );

  const renderFooter = () => {
    if (loading) {
      return (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={Colors.textFaint} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: Colors.textFaint, fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
            Couldn&apos;t load threads — {error.message}
          </Text>
        </View>
      );
    }
    if (!allThreads.length) {
      return (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <Text style={{ color: Colors.textFaint, fontSize: 13, fontWeight: '500' }}>
            No threads yet — tap + to start one.
          </Text>
        </View>
      );
    }
    if (count < days.length) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={Colors.textFaint} />
        </View>
      );
    }
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <Text style={styles.endLabel}>✦ that&apos;s everything</Text>
      </View>
    );
  };

  const renderDay = ({ item: day }: { item: DayGroup }) => (
    <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>{day.label}</Text>
      </View>
      <View style={styles.card}>
        {day.threads.map((t, ti) => {
          const theme = threadTheme(t.tag);
          const rowStyle = {
            paddingVertical: 12, paddingHorizontal: 14,
            borderBottomWidth: ti < day.threads.length - 1 ? 1 : 0,
            borderBottomColor: Colors.border,
            flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12,
          };
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${t.tag} from ${day.label}`}
              onPress={() => onOpenThread(t.id)}
              style={rowStyle}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color }} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontSize: 14, color: theme.color, fontWeight: '700' }}>{t.tag}</Text>
                  <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '500' }}>
                    {formatTime(t.created_at)}
                  </Text>
                </View>
                <Text numberOfLines={1} style={{ fontSize: 12.5, color: Colors.textDim, fontWeight: '500' }}>
                  {threadPreview(t)}
                </Text>
              </View>
              <ChevRightIcon size={14} color={Colors.textFaint} />
            </Pressable>
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
      keyExtractor={(d) => d.dateKey}
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
  sectionLabel: {
    fontSize: 10.5, color: Colors.textFaint, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 4, paddingBottom: 8,
  },
  endLabel: {
    color: Colors.textFaint, fontSize: 11, fontWeight: '500',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  dayHeader: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 4, paddingBottom: 8,
  },
  dayLabel: {
    fontSize: 13, color: Colors.text, fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border, borderWidth: 1,
    borderRadius: 16, overflow: 'hidden',
  },
});
