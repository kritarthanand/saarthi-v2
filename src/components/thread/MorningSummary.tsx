import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors, threadTheme } from '@/constants/theme';
import type { Thread, ThreadItem } from '@/lib/mockData';
import { Checkbox } from '../Checkbox';
import { FlameIcon } from '../icons';

export function MorningSummary({
  thread,
  onItemToggle,
  onItemChat,
}: {
  thread: Thread;
  onItemToggle: (id: string) => void;
  onItemChat: (id: string) => void;
}) {
  const theme = threadTheme(thread.tag);
  const done = thread.items.filter((i) => i.done).length;
  const remaining = thread.items.length - done;
  // Derive points + copy from the live `items` so they track the ring rather than
  // showing stale "32 of 46 / Two left" the instant the user ticks something.
  const pointsEarned = thread.items
    .filter((i) => i.done)
    .reduce((s, i) => s + (i.points ?? 0), 0);
  const pointsTotal = thread.items.reduce((s, i) => s + (i.points ?? 0), 0);
  const heroCopy =
    remaining === 0
      ? 'All clear. Streak holds.'
      : remaining === 1
        ? 'One left — finish it before lunch.'
        : `${remaining} left — knocking them out before lunch keeps the streak.`;
  const r = 32;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4, paddingBottom: 24, gap: 16 }}>
      {/* Hero */}
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
              cx={38}
              cy={38}
              r={r}
              fill="none"
              stroke={theme.color}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${c * (done / thread.items.length)} ${c}`}
              transform="rotate(-90 38 38)"
            />
          </Svg>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.5, lineHeight: 24 }}>
              {done}
              <Text style={{ color: Colors.textFaint, fontSize: 14, fontWeight: '600' }}>/{thread.items.length}</Text>
            </Text>
            <Text
              style={{
                fontSize: 9, color: Colors.textFaint, fontWeight: '600',
                letterSpacing: 1, textTransform: 'uppercase', marginTop: 2,
              }}
            >
              done
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontSize: 11, color: theme.color, fontWeight: '700',
              letterSpacing: 1, textTransform: 'uppercase',
            }}
          >
            {pointsEarned} of {pointsTotal} points
          </Text>
          <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '500', lineHeight: 20 }}>
            {heroCopy}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <FlameIcon size={13} color="#F08A3E" />
            <Text style={{ fontSize: 12, color: Colors.textDim, fontWeight: '500' }}>day 12 streak</Text>
          </View>
        </View>
      </View>

      {/* Checklist */}
      <View style={{ gap: 6 }}>
        {thread.items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            color={theme.color}
            onToggle={() => onItemToggle(item.id)}
            onChat={() => onItemChat(item.id)}
          />
        ))}
      </View>

      {/* AI nudge */}
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
            backgroundColor: Colors.accent,
            marginTop: 1,
          }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 13.5, color: Colors.text, lineHeight: 18 }}>
            &ldquo;Plan top 3 priorities&rdquo; — want me to pull them from your Focus thread?
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {['yes, pull them', "I'll do it manually", 'remind me at 9'].map((s) => (
              <View
                key={s}
                style={{
                  paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: Colors.border, borderWidth: 1,
                }}
              >
                <Text style={{ fontSize: 12, color: Colors.text, fontWeight: '500' }}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function ChecklistRow({
  item,
  color,
  onToggle,
  onChat,
}: {
  item: ThreadItem;
  color: string;
  onToggle: () => void;
  onChat: () => void;
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
      {item.hasChat && (
        <Pressable
          onPress={onChat}
          style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: Colors.accentDim }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.accent }}>chat</Text>
        </Pressable>
      )}
      <Text style={{ fontSize: 11, fontWeight: '600', color, opacity: item.done ? 0.5 : 1 }}>+{item.points}</Text>
    </View>
  );
}
