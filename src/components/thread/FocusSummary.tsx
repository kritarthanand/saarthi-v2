import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { Thread, ThreadItem } from '@/lib/mockData';
import { Checkbox } from '../Checkbox';
import { ChevDownIcon, SendIcon } from '../icons';

export function FocusSummary({
  thread,
  onItemToggle,
}: {
  thread: Thread;
  onItemToggle: (id: string) => void;
}) {
  const theme = threadTheme(thread.tag);
  const [openId, setOpenId] = useState<string | null>(null);
  const remaining = thread.items.filter((i) => !i.done).length;
  const doneCount = thread.items.length - remaining;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4, paddingBottom: 24, gap: 14 }}>
      {/* Hero — day blocks */}
      <View
        style={{
          backgroundColor: theme.dim,
          borderColor: Colors.border, borderWidth: 1, borderRadius: 22,
          padding: 18, gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 11, color: theme.color, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              commitments
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: Colors.text, letterSpacing: -0.5, marginTop: 4 }}>
              {remaining}{' '}
              <Text style={{ fontSize: 16, fontWeight: '500', color: Colors.textDim }}>
                to do · {doneCount} done
              </Text>
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: Colors.textDim, fontWeight: '500' }}>2 scheduled</Text>
        </View>
        <View style={{ gap: 4, marginTop: 4 }}>
          {[
            { time: '10–12', label: 'Onboarding v2 spec', c: theme.color },
            { time: '13:30', label: "Review Anika's PR", c: 'rgba(91,141,239,0.6)' },
            { time: '17–18', label: 'Q3 roadmap outline', c: theme.color },
          ].map((b, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '600', width: 46 }}>{b.time}</Text>
              <View style={{ flex: 1, height: 6, backgroundColor: b.c, borderRadius: 3 }} />
              <Text
                style={{ fontSize: 11.5, color: Colors.textDim, width: 130, textAlign: 'right' }}
                numberOfLines={1}
              >
                {b.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Todo list */}
      <View style={{ gap: 6 }}>
        {thread.items.map((item) => (
          <FocusTodo
            key={item.id}
            item={item}
            theme={theme}
            isOpen={openId === item.id}
            onToggleOpen={() => setOpenId(openId === item.id ? null : item.id)}
            onCheck={() => onItemToggle(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

function FocusTodo({
  item,
  theme,
  isOpen,
  onToggleOpen,
  onCheck,
}: {
  item: ThreadItem;
  theme: { color: string; dim: string; glyph: string };
  isOpen: boolean;
  onToggleOpen: () => void;
  onCheck: () => void;
}) {
  const priorityColor =
    item.priority === 'high' ? theme.color : item.priority === 'med' ? Colors.cyan : Colors.textFaint;

  return (
    <View
      style={{
        backgroundColor: Colors.bgCard,
        borderColor: isOpen ? theme.color + '60' : Colors.border,
        borderWidth: 1, borderRadius: 14, overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onToggleOpen}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}
      >
        <Pressable onPress={onCheck} hitSlop={8}>
          <Checkbox checked={item.done} color={theme.color} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontSize: 14.5, fontWeight: '500',
              color: item.done ? Colors.textFaint : Colors.text,
              textDecorationLine: item.done ? 'line-through' : 'none',
            }}
          >
            {item.label}
          </Text>
          {item.scheduled && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: priorityColor }} />
              <Text style={{ fontSize: 11.5, color: Colors.textDim, fontWeight: '500' }}>{item.scheduled}</Text>
            </View>
          )}
        </View>
        <View
          style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: isOpen ? theme.dim : 'transparent',
            alignItems: 'center', justifyContent: 'center',
            transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
          }}
        >
          <ChevDownIcon size={14} color={isOpen ? theme.color : Colors.textDim} />
        </View>
      </Pressable>
      {isOpen && (
        <View
          style={{
            borderTopWidth: 1, borderTopColor: Colors.border,
            paddingVertical: 12, paddingHorizontal: 14, gap: 10,
            backgroundColor: 'rgba(91,141,239,0.04)',
          }}
        >
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.accent, marginTop: 1 }} />
            <Text style={{ fontSize: 13, color: Colors.text, lineHeight: 18, flex: 1 }}>
              When do you want to do this? I can block time and send you a nudge.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingLeft: 32 }}>
            {['10–12 AM', '1–2 PM', '5–6 PM', 'tonight', 'reschedule'].map((s) => (
              <View
                key={s}
                style={{
                  paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: Colors.border, borderWidth: 1,
                }}
              >
                <Text style={{ fontSize: 12, color: Colors.text, fontWeight: '500' }}>{s}</Text>
              </View>
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingVertical: 8, paddingHorizontal: 12,
              backgroundColor: Colors.bgCardElev, borderRadius: 999,
              borderColor: Colors.border, borderWidth: 1, marginLeft: 32,
            }}
          >
            <TextInput
              placeholder="say something about this todo…"
              placeholderTextColor={Colors.textFaint}
              style={{ flex: 1, color: Colors.text, fontSize: 13 }}
            />
            <Pressable
              style={{
                width: 26, height: 26, borderRadius: 13,
                backgroundColor: theme.color,
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
