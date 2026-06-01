import { ScrollView, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { TODAY_THREADS, type Thread } from '@/lib/mockData';
import { AppHeader } from '../AppHeader';
import { ScoreHeader } from './ScoreHeader';
import { ThreadCard } from './ThreadCard';

export function TodayView({
  onOpenThread,
  customThreads = [],
  topInset = 52,
  rightLabel,
}: {
  onOpenThread: (id: string) => void;
  customThreads?: Thread[];
  topInset?: number;
  rightLabel?: string;
}) {
  const day = new Date('2026-04-29');
  const dayLabel =
    rightLabel ??
    day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{ paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title="Today" right={dayLabel} topInset={topInset} />
      <ScoreHeader />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {TODAY_THREADS.map((t) => (
          <ThreadCard key={t.id} thread={t} onOpen={onOpenThread} />
        ))}
        {customThreads.map((t) => (
          <ThreadCard key={t.id} thread={t} onOpen={onOpenThread} />
        ))}
      </View>
    </ScrollView>
  );
}
