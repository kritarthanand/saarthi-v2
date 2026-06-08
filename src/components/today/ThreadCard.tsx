import { Pressable, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { Thread } from '@/lib/threads';
import { Hashtag } from '../Hashtag';

export function ThreadCard({ thread, onOpen }: { thread: Thread; onOpen: (id: string) => void }) {
  const theme = threadTheme(thread.tag);
  const earned = thread.points_earned;
  const total = thread.points_total;
  const doneCount = thread.done_count;
  const taskCount = thread.task_count;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${thread.tag} thread`}
      onPress={() => onOpen(thread.id)}
      style={{
        backgroundColor: Colors.bgCard,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        paddingHorizontal: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Hashtag tag={thread.tag} size="md" />
        <View
          style={{
            paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999,
            backgroundColor: theme.dim,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.color }}>
            {earned}
            <Text style={{ opacity: 0.5 }}>/{total}</Text>
          </Text>
        </View>
      </View>
      {taskCount > 0 && (
        <Text style={{ fontSize: 12.5, color: Colors.textDim, fontWeight: '500' }}>
          {doneCount} of {taskCount} done
        </Text>
      )}
      {thread.title ? (
        <Text style={{ fontSize: 13, color: Colors.textDim, fontWeight: '500' }} numberOfLines={1}>
          {thread.title}
        </Text>
      ) : null}
    </Pressable>
  );
}
