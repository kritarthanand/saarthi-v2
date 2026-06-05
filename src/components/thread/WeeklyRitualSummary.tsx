import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { EntryItem } from '@/lib/threads';
import type { SummaryViewProps } from '@/lib/threadTemplates';
import { Checkbox } from '../Checkbox';

type WeeklyTab = 'review' | 'plan';

export function WeeklyRitualSummary({
  entry,
  items,
  onToggle,
  readOnly = false,
}: SummaryViewProps) {
  const theme = threadTheme('#WeeklyRitual');
  const [subTab, setSubTab] = useState<WeeklyTab>('review');

  const reviewItems = items.filter((i) => i.section === 'review').sort((a, b) => a.position - b.position);
  const planItems = items.filter((i) => i.section === 'plan').sort((a, b) => a.position - b.position);

  const completionPct = entry.meta.completion_pct as number | undefined;
  const pointsTotal = entry.meta.points_total as number | undefined;
  const streak = entry.meta.streak as number | undefined;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4, paddingBottom: 24, gap: 14 }}>
      {/* Header strip */}
      <View
        style={{
          backgroundColor: theme.dim,
          borderColor: Colors.border, borderWidth: 1, borderRadius: 22,
          padding: 18, gap: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 }}>
          {entry.label ?? 'This week'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {completionPct != null && <StatChip label={`${completionPct}% done`} color={theme.color} />}
          {pointsTotal != null && <StatChip label={`${pointsTotal} pts`} color={theme.color} />}
          {streak != null && <StatChip label={`${streak}-day streak`} color={theme.color} />}
        </View>
      </View>

      {/* Sub-tab bar: Review | Plan */}
      <View
        style={{
          flexDirection: 'row', padding: 3,
          backgroundColor: Colors.bgCard,
          borderColor: Colors.border, borderWidth: 1, borderRadius: 10,
          gap: 2,
        }}
      >
        {(['review', 'plan'] as WeeklyTab[]).map((t) => {
          const active = subTab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setSubTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1, paddingVertical: 7, borderRadius: 8,
                backgroundColor: active ? Colors.bgCardElev : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: '600',
                color: active ? Colors.text : Colors.textDim,
                textTransform: 'capitalize',
              }}>
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Items */}
      <View style={{ gap: 6 }}>
        {(subTab === 'review' ? reviewItems : planItems).map((item) => (
          <WeeklyItemRow
            key={item.id}
            item={item}
            color={theme.color}
            readOnly={readOnly}
            onToggle={onToggle && !readOnly ? () => onToggle(item.id, !item.done) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

function StatChip({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999,
        backgroundColor: color + '20',
        borderColor: color + '40', borderWidth: 1,
      }}
    >
      <Text style={{ fontSize: 12, color, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function WeeklyItemRow({
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
  const priorityColor =
    item.priority === 'high' ? color :
    item.priority === 'med' ? color + '88' :
    Colors.textFaint;

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
      {item.priority && !readOnly && (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: priorityColor }} />
      )}
    </View>
  );
}
