import { ScrollView, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { Thread } from '@/lib/mockData';
import { AppHeader } from '../AppHeader';
import { ScoreHeader } from './ScoreHeader';
import { ThreadCard } from './ThreadCard';

export function TodayView({
  threads,
  onOpenThread,
  topInset = 52,
  rightLabel,
}: {
  threads: Thread[];
  onOpenThread: (id: string) => void;
  topInset?: number;
  rightLabel?: string;
}) {
  // Default to the wall-clock day so the chrome doesn't read "Wed, Apr 29" forever.
  // Callers can still override (e.g. when reviewing a historical day).
  const dayLabel =
    rightLabel ??
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{ paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title="Today" right={dayLabel} topInset={topInset} />
      <ScoreHeader />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {threads.map((t) => (
          <ThreadCard key={t.id} thread={t} onOpen={onOpenThread} />
        ))}
      </View>
    </ScrollView>
  );
}
