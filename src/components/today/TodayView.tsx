import { ScrollView, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { Thread } from '@/lib/threads';
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
