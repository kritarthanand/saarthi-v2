import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { Task, ThreadMessage } from '@/lib/threads';
import type { SummaryViewProps } from '@/lib/threadTemplates';
import { SendIcon } from '../icons';

export function CatchUpSummary({
  thread,
  tasks,
  messages,
  onSendMessage,
  readOnly = false,
}: SummaryViewProps) {
  const theme = threadTheme('#CatchUp');
  const sorted = [...tasks].sort((a, b) => a.position - b.position);
  const reachedCount = sorted.filter(
    (task) => task.status === 'done' || messages.some((m) => m.task_ref === task.id && m.role === 'user'),
  ).length;

  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          people check-in
        </Text>
        <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '500', lineHeight: 20 }}>
          {thread.title ?? 'This week'} · {reachedCount} of {sorted.length} reached
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {sorted.map((task) => {
          const taskMessages = messages.filter((m) => m.task_ref === task.id);
          const reached = task.status === 'done' || taskMessages.some((m) => m.role === 'user');
          return (
            <CatchUpRow
              key={task.id}
              task={reached ? { ...task, status: 'done' as const } : task}
              color={theme.color}
              readOnly={readOnly}
              messages={taskMessages}
              expanded={expandedId === task.id}
              onToggleExpand={() => setExpandedId((id) => (id === task.id ? null : task.id))}
              onSend={
                !readOnly && onSendMessage
                  ? (text) => {
                      onSendMessage(text, task.id);
                      setExpandedId(null);
                    }
                  : undefined
              }
            />
          );
        })}
      </View>
    </View>
  );
}

function CatchUpRow({
  task,
  color,
  readOnly,
  messages,
  expanded,
  onToggleExpand,
  onSend,
}: {
  task: Task;
  color: string;
  readOnly: boolean;
  messages: ThreadMessage[];
  expanded: boolean;
  onToggleExpand: () => void;
  onSend?: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const isDone = task.status === 'done';
  const userNote = messages.find((m) => m.role === 'user');

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed || !onSend) return;
    onSend(trimmed);
    setDraft('');
  };

  return (
    <View
      style={{
        backgroundColor: Colors.bgCard,
        borderColor: expanded ? color + '60' : Colors.border,
        borderWidth: 1, borderRadius: 14, overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => !readOnly && !isDone && onToggleExpand()}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}
      >
        <View
          style={{
            width: 18, height: 18, borderRadius: 9, marginTop: 2,
            backgroundColor: isDone ? color : 'transparent',
            borderColor: isDone ? color : Colors.borderStrong,
            borderWidth: isDone ? 0 : 1.5,
          }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontSize: 14.5, fontWeight: '500',
              color: isDone ? Colors.textFaint : Colors.text,
              textDecorationLine: isDone ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </Text>
          {userNote && (
            <Text style={{ fontSize: 13, color: Colors.textDim, lineHeight: 18 }} numberOfLines={2}>
              {userNote.content}
            </Text>
          )}
        </View>
      </Pressable>

      {expanded && (
        <View
          style={{
            borderTopWidth: 1, borderTopColor: Colors.border,
            paddingVertical: 12, paddingHorizontal: 14, gap: 8,
          }}
        >
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingVertical: 8, paddingHorizontal: 12,
              backgroundColor: Colors.bgCardElev, borderRadius: 12,
              borderColor: Colors.border, borderWidth: 1,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              returnKeyType="done"
              placeholder={`notes on: ${task.title.toLowerCase()}…`}
              placeholderTextColor={Colors.textFaint}
              style={{ flex: 1, color: Colors.text, fontSize: 13 }}
              autoFocus
            />
            <Pressable
              onPress={submit}
              disabled={!draft.trim()}
              style={{
                width: 26, height: 26, borderRadius: 13,
                backgroundColor: draft.trim() ? color : Colors.bgCard,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <SendIcon size={13} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
