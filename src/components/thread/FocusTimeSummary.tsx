import { Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { Task } from '@/lib/threads';
import type { SummaryViewProps } from '@/lib/threadTemplates';
import { Checkbox } from '../Checkbox';

export function FocusTimeSummary({ tasks, onToggleTask, readOnly = false }: SummaryViewProps) {
  const theme = threadTheme('#FocusTime');
  const sorted = [...tasks].sort((a, b) => a.position - b.position);
  const done = sorted.filter((t) => t.status === 'done').length;
  const total = sorted.length;
  const pointsEarned = sorted.filter((t) => t.status === 'done').reduce((s, t) => s + t.points, 0);
  const pointsTotal = sorted.reduce((s, t) => s + t.points, 0);

  const heroCopy =
    done === total && total > 0
      ? 'Session wrapped. Deep work done.'
      : done === 0
        ? 'Set your intention and go deep.'
        : `${done} of ${total} steps — stay in the zone.`;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4, paddingBottom: 24, gap: 14 }}>
      <View
        style={{
          backgroundColor: theme.dim,
          borderColor: Colors.border, borderWidth: 1, borderRadius: 22,
          padding: 18, gap: 4,
        }}
      >
        <Text style={{ fontSize: 11, color: theme.color, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
          focus session · {pointsEarned}/{pointsTotal} pts
        </Text>
        <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '500', lineHeight: 20 }}>
          {heroCopy}
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        {sorted.map((task) => (
          <SimpleChecklistRow
            key={task.id}
            task={task}
            color={theme.color}
            readOnly={readOnly}
            onToggle={
              onToggleTask && !readOnly
                ? () => onToggleTask(task.id, task.status === 'done' ? 'open' : 'done')
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}

function SimpleChecklistRow({
  task,
  color,
  readOnly: _readOnly,
  onToggle,
}: {
  task: Task;
  color: string;
  readOnly: boolean;
  onToggle?: () => void;
}) {
  const isDone = task.status === 'done';
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 14,
        backgroundColor: isDone ? 'rgba(255,255,255,0.015)' : Colors.bgCard,
        borderColor: isDone ? 'transparent' : Colors.border,
        borderWidth: 1, borderRadius: 14,
      }}
    >
      <Checkbox checked={isDone} color={color} onPress={onToggle} />
      <Text
        style={{
          flex: 1, fontSize: 14.5, fontWeight: '500',
          color: isDone ? Colors.textFaint : Colors.text,
          textDecorationLine: isDone ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color, opacity: isDone ? 0.5 : 1 }}>
        +{task.points}
      </Text>
    </View>
  );
}
