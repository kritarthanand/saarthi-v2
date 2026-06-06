import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors, threadTheme } from '@/constants/theme';
import type { EntryItem, EntryMessage } from '@/lib/threads';
import type { SummaryViewProps } from '@/lib/threadTemplates';
import { Checkbox } from '../Checkbox';
import { FlameIcon, SendIcon } from '../icons';

export function MorningRitualSummary({
  entry,
  items,
  messages,
  onToggle,
  onSendMessage,
  onSuggestionChoice,
  onEndRitual,
  readOnly = false,
}: SummaryViewProps) {
  const theme = threadTheme('#MorningRitual');
  const sorted = [...items].sort((a, b) => a.position - b.position);

  const done = sorted.filter((i) => i.done).length;
  const total = sorted.length;
  const pointsEarned = sorted.filter((i) => i.done).reduce((s, i) => s + i.points, 0);
  const pointsTotal = sorted.reduce((s, i) => s + i.points, 0);
  const remaining = total - done;
  const streak = (entry.meta.streak as number | undefined) ?? 0;

  const heroCopy =
    remaining === 0
      ? 'All clear. Streak holds.'
      : remaining === 1
        ? 'One left — finish strong.'
        : `${remaining} left — finish before you leave the house.`;

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
          {streak === 0 && remaining > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <FlameIcon size={13} color={Colors.textFaint} />
              <Text style={{ fontSize: 12, color: Colors.textFaint, fontWeight: '500' }}>start your streak today</Text>
            </View>
          )}
        </View>
      </View>

      {/* Checklist + reflection items */}
      <View style={{ gap: 6 }}>
        {sorted.map((item) => {
          if (item.meta.type === 'reflection') {
            const savedText = messages.find((m) => m.item_ref === item.id && m.role === 'user')?.text;
            return (
              <MorningReflectionRow
                key={item.id}
                item={item}
                color={theme.color}
                readOnly={readOnly}
                savedText={savedText}
                onSend={onSendMessage && !readOnly ? (text) => onSendMessage(text, item.id) : undefined}
              />
            );
          }
          return (
            <MorningChecklistRow
              key={item.id}
              item={item}
              color={theme.color}
              readOnly={readOnly}
              onToggle={onToggle && !readOnly ? () => onToggle(item.id, !item.done) : undefined}
            />
          );
        })}
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
          <View
            style={{
              width: 26, height: 26, borderRadius: 13,
              backgroundColor: theme.dim,
              borderColor: theme.color + '50', borderWidth: 1,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.color }}>S</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 13.5, color: Colors.text, lineHeight: 18 }}>{suggestion.text}</Text>
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

      {/* End Morning Ritual / Undo */}
      {!readOnly && onEndRitual && (
        <EndRitualButton
          onPress={onEndRitual}
          color={theme.color}
          allDone={remaining === 0}
          ended={!!entry.meta.ritual_ended_at}
        />
      )}
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MorningChecklistRow({
  item,
  color,
  readOnly,
  onToggle,
}: {
  item: EntryItem;
  color: string;
  readOnly: boolean;
  onToggle?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 14,
        backgroundColor: item.done ? 'rgba(255,255,255,0.015)' : Colors.bgCard,
        borderColor: item.done ? 'transparent' : Colors.border,
        borderWidth: 1, borderRadius: 14,
      }}
    >
      <Checkbox checked={item.done} color={color} onPress={onToggle} />
      <Text
        style={{
          flex: 1, fontSize: 14.5, fontWeight: '500',
          color: item.done ? Colors.textFaint : Colors.text,
          textDecorationLine: item.done ? 'line-through' : 'none',
        }}
      >
        {item.label}
      </Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color, opacity: item.done ? 0.4 : 1 }}>
        +{item.points}
      </Text>
    </View>
  );
}

function MorningReflectionRow({
  item,
  color,
  readOnly,
  savedText,
  onSend,
}: {
  item: EntryItem;
  color: string;
  readOnly: boolean;
  savedText?: string;
  onSend?: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const isDone = item.done || !!savedText;

  const submit = () => {
    const t = draft.trim();
    if (!t || !onSend) return;
    onSend(t);
    setDraft('');
    setExpanded(false);
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
        onPress={() => !readOnly && !isDone && setExpanded((e) => !e)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}
      >
        {/* Pencil-style indicator */}
        <View
          style={{
            width: 18, height: 18, borderRadius: 5, marginTop: 2,
            backgroundColor: isDone ? color : 'transparent',
            borderColor: isDone ? color : Colors.borderStrong,
            borderWidth: isDone ? 0 : 1.5,
          }}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              fontSize: 14.5, fontWeight: '500',
              color: isDone ? Colors.textFaint : Colors.text,
              textDecorationLine: isDone ? 'line-through' : 'none',
            }}
          >
            {item.label}
          </Text>
          {savedText && (
            <Text style={{ fontSize: 13, color: Colors.textDim, lineHeight: 18 }} numberOfLines={3}>
              {savedText}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 11, fontWeight: '600', color, opacity: isDone ? 0.4 : 1, marginTop: 2 }}>
          +{item.points}
        </Text>
      </Pressable>

      {expanded && (
        <View
          style={{
            borderTopWidth: 1, borderTopColor: Colors.border,
            padding: 14, gap: 10,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder={`${item.label.toLowerCase()}…`}
            placeholderTextColor={Colors.textFaint}
            style={{
              color: Colors.text, fontSize: 13.5, lineHeight: 20,
              minHeight: 72, textAlignVertical: 'top',
            }}
            autoFocus
          />
          <Pressable
            onPress={submit}
            disabled={!draft.trim()}
            style={{
              paddingVertical: 10, borderRadius: 10,
              backgroundColor: draft.trim() ? color : 'rgba(255,255,255,0.04)',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 13, fontWeight: '700',
                color: draft.trim() ? Colors.bg : Colors.textDim,
              }}
            >
              Save
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function EndRitualButton({
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
  // Three visual states: pre-end (muted), pre-end & all done (full color),
  // ended (outlined "undo" affordance — clearly different so the user can tell).
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
        {ended ? 'Undo — Reopen Morning Ritual' : 'End Morning Ritual'}
      </Text>
    </Pressable>
  );
}
