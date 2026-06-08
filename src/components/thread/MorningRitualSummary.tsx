import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors, threadTheme } from '@/constants/theme';
import type { Task, TaskStatus, ThreadMessage } from '@/lib/threads';
import type { SummaryViewProps } from '@/lib/threadTemplates';
import { Checkbox } from '../Checkbox';
import { FlameIcon } from '../icons';

export function MorningRitualSummary({
  thread,
  tasks,
  messages,
  onToggleTask,
  onSuggestionChoice,
  readOnly = false,
}: SummaryViewProps) {
  const theme = threadTheme('#MorningRitual');
  const sorted = [...tasks].sort((a, b) => a.position - b.position);
  const done = sorted.filter((t) => t.status === 'done').length;
  const total = sorted.length;
  const pointsEarned = sorted.filter((t) => t.status === 'done').reduce((s, t) => s + t.points, 0);
  const pointsTotal = sorted.reduce((s, t) => s + t.points, 0);
  const remaining = total - done;
  const streak = (thread.meta.streak as number | undefined) ?? 0;

  const heroCopy =
    remaining === 0
      ? 'All clear. Streak holds.'
      : remaining === 1
        ? 'One left — finish it before lunch.'
        : `${remaining} left — knocking them out before lunch keeps the streak.`;

  const r = 32;
  const circumference = 2 * Math.PI * r;

  const suggestion = [...messages]
    .reverse()
    .find((m) => m.role === 'ai' && m.meta.suggests === true);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4, paddingBottom: 24, gap: 16 }}>
      {/* Points card */}
      <View
        style={{
          backgroundColor: theme.dim,
          borderColor: Colors.border, borderWidth: 1, borderRadius: 22, padding: 18,
          flexDirection: 'row', alignItems: 'center', gap: 16,
        }}
      >
        <View style={{ width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={76} height={76} viewBox="0 0 76 76" style={{ position: 'absolute' }}>
            <Circle cx={38} cy={38} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
            <Circle
              cx={38} cy={38} r={r} fill="none"
              stroke={theme.color} strokeWidth={6} strokeLinecap="round"
              strokeDasharray={`${total > 0 ? circumference * (done / total) : 0} ${circumference}`}
              transform="rotate(-90 38 38)"
            />
          </Svg>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.5, lineHeight: 24 }}>
              {done}
              <Text style={{ color: Colors.textFaint, fontSize: 14, fontWeight: '600' }}>/{total}</Text>
            </Text>
            <Text style={{ fontSize: 9, color: Colors.textFaint, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>
              done
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 11, color: theme.color, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
            {pointsEarned} of {pointsTotal} points
          </Text>
          <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '500', lineHeight: 20 }}>
            {heroCopy}
          </Text>
          {streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <FlameIcon size={13} color="#F08A3E" />
              <Text style={{ fontSize: 12, color: Colors.textDim, fontWeight: '500' }}>day {streak} streak</Text>
            </View>
          )}
        </View>
      </View>

      {/* Checklist */}
      <View style={{ gap: 6 }}>
        {sorted.map((task) => (
          <MorningChecklistRow
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

      {/* AI suggestion */}
      {suggestion && !readOnly && (
        <View
          style={{
            padding: 14, backgroundColor: Colors.bgCard,
            borderColor: Colors.border, borderWidth: 1, borderRadius: 14,
            flexDirection: 'row', gap: 10, alignItems: 'flex-start',
          }}
        >
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.accent, marginTop: 1 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 13.5, color: Colors.text, lineHeight: 18 }}>{suggestion.content}</Text>
            {Array.isArray(suggestion.meta.chip_labels) && (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {(suggestion.meta.chip_labels as string[]).map((chip) => (
                  <Pressable
                    key={chip}
                    onPress={() => onSuggestionChoice?.(suggestion, chip)}
                    style={{
                      paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderColor: Colors.border, borderWidth: 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: Colors.text, fontWeight: '500' }}>{chip}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function MorningChecklistRow({
  task,
  color,
  readOnly,
  onToggle,
}: {
  task: Task;
  color: string;
  readOnly: boolean;
  onToggle?: () => void;
}) {
  const isDone = task.status === 'done';
  const hasChat = task.meta.has_chat === true;
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
      {hasChat && !readOnly && (
        <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: Colors.accentDim }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.accent }}>chat</Text>
        </View>
      )}
      <Text style={{ fontSize: 11, fontWeight: '600', color, opacity: isDone ? 0.5 : 1 }}>+{task.points}</Text>
    </View>
  );
}
