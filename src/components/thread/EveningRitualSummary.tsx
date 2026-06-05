import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { EntryItem, EntryMessage } from '@/lib/threads';
import type { SummaryViewProps } from '@/lib/threadTemplates';
import { SendIcon } from '../icons';

export function EveningRitualSummary({
  entry,
  items,
  messages,
  onSendMessage,
  readOnly = false,
}: SummaryViewProps) {
  const theme = threadTheme('#EveningRitual');
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const answeredCount = sorted.filter(
    (item) => item.done || messages.some((m) => m.item_ref === item.id && m.role === 'user'),
  ).length;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4, paddingBottom: 24, gap: 14 }}>
      {/* Header strip */}
      <View
        style={{
          backgroundColor: theme.dim,
          borderColor: Colors.border, borderWidth: 1, borderRadius: 22,
          padding: 18, gap: 4,
        }}
      >
        <Text style={{ fontSize: 11, color: theme.color, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
          wind-down + reflect
        </Text>
        <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '500', lineHeight: 20 }}>
          {entry.label ?? 'Tonight'} · {answeredCount} of {sorted.length} answered
        </Text>
      </View>

      {/* Reflection prompts */}
      <View style={{ gap: 8 }}>
        {sorted.map((item) => {
          const itemMessages = messages.filter((m) => m.item_ref === item.id);
          const answered = item.done || itemMessages.some((m) => m.role === 'user');
          return (
            <EveningPromptRow
              key={item.id}
              item={answered ? { ...item, done: true } : item}
              color={theme.color}
              readOnly={readOnly}
              messages={itemMessages}
              onSend={!readOnly && onSendMessage ? (text) => onSendMessage(text, item.id) : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}

function EveningPromptRow({
  item,
  color,
  readOnly,
  messages,
  onSend,
}: {
  item: EntryItem;
  color: string;
  readOnly: boolean;
  messages: EntryMessage[];
  onSend?: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');

  const userAnswer = messages.find((m) => m.role === 'user');

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed || !onSend) return;
    onSend(trimmed);
    setDraft('');
    setExpanded(false);
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
        onPress={() => !readOnly && !item.done && setExpanded((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}
      >
        <View
          style={{
            width: 18, height: 18, borderRadius: 9, marginTop: 2,
            backgroundColor: item.done ? color : 'transparent',
            borderColor: item.done ? color : Colors.borderStrong,
            borderWidth: item.done ? 0 : 1.5,
          }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontSize: 14.5, fontWeight: '500',
              color: item.done ? Colors.textFaint : Colors.text,
              textDecorationLine: item.done ? 'line-through' : 'none',
            }}
          >
            {item.label}
          </Text>
          {userAnswer && (
            <Text style={{ fontSize: 13, color: Colors.textDim, lineHeight: 18 }} numberOfLines={2}>
              {userAnswer.text}
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
              placeholder={`reflect on: ${item.label.toLowerCase()}…`}
              placeholderTextColor={Colors.textFaint}
              style={{ flex: 1, color: Colors.text, fontSize: 13 }}
              autoFocus
              multiline
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
