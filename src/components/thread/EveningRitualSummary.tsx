import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { EntryItem, EntryMessage } from '@/lib/threads';
import type { SummaryViewProps } from '@/lib/threadTemplates';
import { Checkbox } from '../Checkbox';
import { SendIcon } from '../icons';

export function EveningRitualSummary({
  entry,
  items,
  messages,
  onToggle,
  onSendMessage,
  onEndRitual,
  morningTop3,
  readOnly = false,
}: SummaryViewProps) {
  const theme = threadTheme('#EveningRitual');
  const sorted = [...items].sort((a, b) => a.position - b.position);

  // Single expanded item at a time to avoid competing autoFocus calls.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const doneCount = sorted.filter((item) => {
    if (item.meta.type === 'action') return item.done;
    return messages.some((m) => m.item_ref === item.id && m.role === 'user');
  }).length;

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const makeSendHandler = (itemId: string) =>
    onSendMessage && !readOnly
      ? (text: string) => {
          onSendMessage(text, itemId);
          setExpandedId(null);
        }
      : undefined;

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
          {entry.label ?? 'Tonight'} · {doneCount} of {sorted.length} done
        </Text>
      </View>

      {/* Items */}
      <View style={{ gap: 8 }}>
        {sorted.map((item) => {
          const itemMessages = messages.filter((m) => m.item_ref === item.id);
          const type = item.meta.type as string | undefined;

          if (type === 'action') {
            return (
              <EveningCheckboxRow
                key={item.id}
                item={item}
                color={theme.color}
                readOnly={readOnly}
                messages={itemMessages}
                expanded={expandedId === item.id}
                onToggleExpand={() => toggleExpand(item.id)}
                onToggle={onToggle && !readOnly ? (done) => onToggle(item.id, done) : undefined}
                onSend={makeSendHandler(item.id)}
              />
            );
          }

          if (type === 'morning_review') {
            const answered = itemMessages.some((m) => m.role === 'user');
            return (
              <MorningGoalsReviewRow
                key={item.id}
                item={answered ? { ...item, done: true } : item}
                color={theme.color}
                readOnly={readOnly}
                morningTop3={morningTop3}
                messages={itemMessages}
                expanded={expandedId === item.id}
                onToggleExpand={() => toggleExpand(item.id)}
                onSend={makeSendHandler(item.id)}
              />
            );
          }

          // Default: open-text reflection
          const answered = itemMessages.some((m) => m.role === 'user');
          return (
            <EveningPromptRow
              key={item.id}
              item={answered ? { ...item, done: true } : item}
              color={theme.color}
              readOnly={readOnly}
              messages={itemMessages}
              expanded={expandedId === item.id}
              onToggleExpand={() => toggleExpand(item.id)}
              onSend={makeSendHandler(item.id)}
            />
          );
        })}
      </View>

      {/* Stays interactive even when readOnly so Undo is reachable. */}
      {onEndRitual && (
        <EndEveningRitualButton
          onPress={onEndRitual}
          color={theme.color}
          allDone={doneCount === sorted.length && sorted.length > 0}
          ended={!!entry.meta.ritual_ended_at}
        />
      )}
    </View>
  );
}

function EndEveningRitualButton({
  onPress,
  color,
  allDone,
  ended,
}: {
  onPress: () => void;
  color: string;
  allDone: boolean;
  ended: boolean;
}) {
  // Mirrors MorningRitualSummary.EndRitualButton's three-state look.
  const filled = ended ? false : allDone;
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginTop: 4, paddingVertical: 15, borderRadius: 16,
        backgroundColor: filled ? color : 'rgba(255,255,255,0.04)',
        borderColor: ended ? color : (filled ? color : Colors.border),
        borderWidth: ended ? 1.5 : 1,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 15, fontWeight: '700', letterSpacing: 0.2,
          color: filled ? Colors.bg : (ended ? color : Colors.textDim),
        }}
      >
        {ended ? 'Undo — Reopen Evening Ritual' : 'End Evening Ritual'}
      </Text>
    </Pressable>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EveningCheckboxRow({
  item,
  color,
  readOnly,
  messages,
  expanded,
  onToggleExpand,
  onToggle,
  onSend,
}: {
  item: EntryItem;
  color: string;
  readOnly: boolean;
  messages: EntryMessage[];
  expanded: boolean;
  onToggleExpand: () => void;
  onToggle?: (done: boolean) => void;
  onSend?: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const userNote = messages.find((m) => m.role === 'user');
  const aiResponse = messages.find((m) => m.role === 'ai');

  const submit = () => {
    const t = draft.trim();
    if (!t || !onSend) return;
    onSend(t);
    setDraft('');
  };

  return (
    <View
      style={{
        backgroundColor: item.done ? 'rgba(255,255,255,0.015)' : Colors.bgCard,
        borderColor: expanded ? color + '60' : (item.done ? 'transparent' : Colors.border),
        borderWidth: 1, borderRadius: 14, overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 12,
          paddingVertical: 12, paddingHorizontal: 14,
        }}
      >
        <View style={{ paddingTop: 1 }}>
          <Checkbox
            checked={item.done}
            color={color}
            onPress={onToggle ? () => onToggle(!item.done) : undefined}
          />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              fontSize: 14.5, fontWeight: '500',
              color: item.done ? Colors.textFaint : Colors.text,
              textDecorationLine: item.done ? 'line-through' : 'none',
            }}
          >
            {item.label}
          </Text>
          {userNote && (
            <Text style={{ fontSize: 13, color: Colors.textDim, lineHeight: 18 }} numberOfLines={2}>
              {userNote.text}
            </Text>
          )}
        </View>
        {!readOnly && !item.done && (
          <Pressable
            onPress={onToggleExpand}
            style={{
              paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6,
              backgroundColor: expanded ? color + '20' : 'rgba(255,255,255,0.04)',
              borderColor: expanded ? color + '40' : Colors.border, borderWidth: 1,
            }}
          >
            <Text style={{ fontSize: 11, color: expanded ? color : Colors.textDim, fontWeight: '600' }}>
              note
            </Text>
          </Pressable>
        )}
      </View>

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
              placeholder="add a note…"
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

      {aiResponse && !expanded && (
        <View
          style={{
            borderTopWidth: 1, borderTopColor: Colors.border,
            paddingHorizontal: 14, paddingVertical: 10,
            flexDirection: 'row', gap: 8,
          }}
        >
          <View
            style={{
              width: 18, height: 18, borderRadius: 9,
              backgroundColor: color + '30',
              borderColor: color + '50', borderWidth: 1,
              alignItems: 'center', justifyContent: 'center',
              marginTop: 1,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: '700', color }}>S</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: Colors.textDim, lineHeight: 18 }}>
            {aiResponse.text}
          </Text>
        </View>
      )}
    </View>
  );
}

function MorningGoalsReviewRow({
  item,
  color,
  readOnly,
  morningTop3,
  messages,
  expanded,
  onToggleExpand,
  onSend,
}: {
  item: EntryItem;
  color: string;
  readOnly: boolean;
  morningTop3?: string;
  messages: EntryMessage[];
  expanded: boolean;
  onToggleExpand: () => void;
  onSend?: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const userAnswer = messages.find((m) => m.role === 'user');
  const aiResponse = messages.find((m) => m.role === 'ai');
  const isDone = item.done || !!userAnswer;

  const submit = () => {
    const t = draft.trim();
    if (!t || !onSend) return;
    onSend(t);
    setDraft('');
  };

  return (
    <View
      style={{
        backgroundColor: isDone ? 'rgba(255,255,255,0.015)' : Colors.bgCard,
        borderColor: expanded ? color + '60' : (isDone ? 'transparent' : Colors.border),
        borderWidth: 1, borderRadius: 14, overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => !readOnly && !isDone && onToggleExpand()}
        style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 12,
          paddingVertical: 12, paddingHorizontal: 14,
        }}
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
            padding: 14, gap: 10,
          }}
        >
          {morningTop3 ? (
            <View
              style={{
                padding: 12, borderRadius: 10,
                backgroundColor: Colors.bgCardElev,
                borderLeftWidth: 2, borderLeftColor: color,
              }}
            >
              <Text style={{ fontSize: 10, color, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
                this morning's top 3
              </Text>
              <Text style={{ fontSize: 13, color: Colors.textDim, lineHeight: 19 }}>
                {morningTop3}
              </Text>
            </View>
          ) : (
            <View
              style={{
                padding: 12, borderRadius: 10,
                backgroundColor: Colors.bgCardElev,
                borderLeftWidth: 2, borderLeftColor: Colors.border,
              }}
            >
              <Text style={{ fontSize: 13, color: Colors.textFaint, fontStyle: 'italic' }}>
                No morning goals recorded today.
              </Text>
            </View>
          )}
          <View
            style={{
              paddingVertical: 8, paddingHorizontal: 12,
              backgroundColor: Colors.bgCardElev, borderRadius: 12,
              borderColor: Colors.border, borderWidth: 1,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder="how did it go?"
              placeholderTextColor={Colors.textFaint}
              style={{
                color: Colors.text, fontSize: 13, lineHeight: 18,
                minHeight: 48, textAlignVertical: 'top',
              }}
              autoFocus
            />
            <Pressable
              onPress={submit}
              disabled={!draft.trim()}
              style={{
                alignSelf: 'flex-end', marginTop: 6,
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: draft.trim() ? color : Colors.bgCard,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <SendIcon size={13} />
            </Pressable>
          </View>
        </View>
      )}

      {aiResponse && !expanded && (
        <View
          style={{
            borderTopWidth: 1, borderTopColor: Colors.border,
            paddingHorizontal: 14, paddingVertical: 10,
            flexDirection: 'row', gap: 8,
          }}
        >
          <View
            style={{
              width: 18, height: 18, borderRadius: 9,
              backgroundColor: color + '30',
              borderColor: color + '50', borderWidth: 1,
              alignItems: 'center', justifyContent: 'center',
              marginTop: 1,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: '700', color }}>S</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: Colors.textDim, lineHeight: 18 }}>
            {aiResponse.text}
          </Text>
        </View>
      )}
    </View>
  );
}

function EveningPromptRow({
  item,
  color,
  readOnly,
  messages,
  expanded,
  onToggleExpand,
  onSend,
}: {
  item: EntryItem;
  color: string;
  readOnly: boolean;
  messages: EntryMessage[];
  expanded: boolean;
  onToggleExpand: () => void;
  onSend?: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const userAnswer = messages.find((m) => m.role === 'user');
  const aiResponse = messages.find((m) => m.role === 'ai');

  const submit = () => {
    const t = draft.trim();
    if (!t || !onSend) return;
    onSend(t);
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
        onPress={() => !readOnly && !item.done && onToggleExpand()}
        style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 12,
          paddingVertical: 12, paddingHorizontal: 14,
        }}
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

      {aiResponse && !expanded && (
        <View
          style={{
            borderTopWidth: 1, borderTopColor: Colors.border,
            paddingHorizontal: 14, paddingVertical: 10,
            flexDirection: 'row', gap: 8,
          }}
        >
          <View
            style={{
              width: 18, height: 18, borderRadius: 9,
              backgroundColor: color + '30',
              borderColor: color + '50', borderWidth: 1,
              alignItems: 'center', justifyContent: 'center',
              marginTop: 1,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: '700', color }}>S</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: Colors.textDim, lineHeight: 18 }}>
            {aiResponse.text}
          </Text>
        </View>
      )}
    </View>
  );
}
