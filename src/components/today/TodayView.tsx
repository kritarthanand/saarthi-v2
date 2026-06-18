import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { Thread } from '@/lib/threads';
import { AppHeader } from '../AppHeader';
import { ScoreHeader } from './ScoreHeader';
import { ThreadCard } from './ThreadCard';

export function TodayView({
  threads,
  onOpenThread,
  onNew,
  topInset = 52,
  rightLabel,
}: {
  threads: Thread[];
  onOpenThread: (id: string) => void;
  onNew?: () => void;
  topInset?: number;
  rightLabel?: string;
}) {
  // Sort by scheduled start time when present; fall back to created_at.
  // Minutes-since-midnight makes the two keys comparable on a single axis.
  const sortedThreads = useMemo(() => {
    const key = (t: Thread): number => {
      if (t.scheduled_start_time) {
        const [h, m] = t.scheduled_start_time.split(':').map((s) => parseInt(s, 10));
        return h * 60 + m;
      }
      const d = new Date(t.created_at);
      return d.getHours() * 60 + d.getMinutes();
    };
    return [...threads].sort((a, b) => key(a) - key(b));
  }, [threads]);

  const dayLabel =
    rightLabel ??
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const headerRight = onNew ? (
    <Pressable
      onPress={onNew}
      accessibilityRole="button"
      accessibilityLabel="New thread"
      style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.bgCard,
        borderColor: Colors.border, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 20, color: Colors.text, lineHeight: 24, fontWeight: '300' }}>+</Text>
    </Pressable>
  ) : dayLabel;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{ paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title="Today" right={headerRight} topInset={topInset} />
      <ScoreHeader />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {sortedThreads.map((t) => (
          <ThreadCard key={t.id} thread={t} onOpen={onOpenThread} />
        ))}
      </View>
    </ScrollView>
  );
}
