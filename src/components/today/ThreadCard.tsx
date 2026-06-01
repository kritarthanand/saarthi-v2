import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { Thread } from '@/lib/mockData';
import { Hashtag } from '../Hashtag';

function MorningPreview({ thread }: { thread: Thread }) {
  const theme = threadTheme(thread.tag);
  const pct = thread.pointsTotal ? thread.pointsEarned / thread.pointsTotal : 0;
  return (
    <View style={{ gap: 10 }}>
      {thread.mantra && (
        <Text
          style={{
            fontSize: 17, fontWeight: '600', fontStyle: 'italic',
            color: theme.color, letterSpacing: -0.2,
          }}
        >
          &ldquo;{thread.mantra}&rdquo;
        </Text>
      )}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: theme.color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function FocusPreview({ thread }: { thread: Thread }) {
  const theme = threadTheme(thread.tag);
  return (
    <View style={{ gap: 10 }}>
      {thread.headline && typeof thread.headline === 'string' && (
        <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 }}>
          {thread.headline}
        </Text>
      )}
      {thread.chips && thread.chips.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {thread.chips.map((c, i) => (
            <View
              key={i}
              style={{
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999,
                backgroundColor: theme.dim, opacity: c.done ? 0.55 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 12, fontWeight: '600', color: theme.color,
                  textDecorationLine: c.done ? 'line-through' : 'none',
                }}
              >
                {c.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function FocusTitlePreview({ thread }: { thread: Thread }) {
  const title = typeof thread.headline === 'string' ? thread.headline : thread.items[0]?.label;
  return (
    <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 }}>
      {title}
    </Text>
  );
}

function WorkoutPreview({ thread }: { thread: Thread }) {
  const items = Array.isArray(thread.headline) ? thread.headline : [];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <Text style={{ fontSize: 14, color: Colors.textFaint }}>+</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18 }}>{it.emoji}</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 }}>
              {it.label}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

function FoodPreview({ thread }: { thread: Thread }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {(thread.stats || []).map((s, i) => (
        <View key={i} style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontSize: 12, color: Colors.textDim, fontWeight: '500' }}>{s.label}</Text>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${s.pct * 100}%`, backgroundColor: s.color, borderRadius: 2 }} />
          </View>
          <Text style={{ fontSize: 13, color: Colors.text, fontWeight: '600' }}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

function NotePreview({ thread }: { thread: Thread }) {
  const theme = threadTheme(thread.tag);
  const firstUser = thread.messages?.find((m) => m.from === 'me');
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderLeftColor: theme.color,
        paddingLeft: 9,
      }}
    >
      <Text numberOfLines={2} style={{ fontSize: 13, color: Colors.textDim, fontWeight: '500', lineHeight: 18 }}>
        &ldquo;{firstUser?.text || 'voice note'}&rdquo;
      </Text>
    </View>
  );
}

// Catch-all preview: render a concise item summary. Used for any kind without a
// bespoke editorial layout (currently `evening` once unlocked, and `fitness`).
function GenericPreview({ thread }: { thread: Thread }) {
  const remaining = thread.items.filter((i) => !i.done).length;
  const headline =
    typeof thread.headline === 'string'
      ? thread.headline
      : thread.preview?.[0] || thread.items[0]?.label;
  if (!headline) return null;
  return (
    <View style={{ gap: 4 }}>
      <Text
        numberOfLines={1}
        style={{ fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 }}
      >
        {headline}
      </Text>
      {thread.items.length > 0 && (
        <Text style={{ fontSize: 12, color: Colors.textDim, fontWeight: '500' }}>
          {remaining} to do · {thread.items.length - remaining} done
        </Text>
      )}
    </View>
  );
}

function renderPreview(thread: Thread) {
  switch (thread.kind) {
    case 'checklist':
      return <MorningPreview thread={thread} />;
    case 'focus':
      return <FocusPreview thread={thread} />;
    case 'focus-title':
      return <FocusTitlePreview thread={thread} />;
    case 'workout':
      return <WorkoutPreview thread={thread} />;
    case 'food':
      return <FoodPreview thread={thread} />;
    case 'note':
      return <NotePreview thread={thread} />;
    case 'evening':
    case 'fitness':
      return <GenericPreview thread={thread} />;
    default: {
      // Exhaustiveness — adding a new ThreadKind without a preview branch fails at compile time.
      const _exhaustive: never = thread.kind;
      return null;
    }
  }
}

export function ThreadCard({ thread, onOpen }: { thread: Thread; onOpen: (id: string) => void }) {
  const theme = threadTheme(thread.tag);
  return (
    <Pressable
      onPress={() => onOpen(thread.id)}
      style={{
        backgroundColor: Colors.bgCard,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        paddingHorizontal: 16,
        gap: 10,
        opacity: thread.locked ? 0.6 : 1,
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
            {thread.pointsEarned}
            <Text style={{ opacity: 0.5 }}>/{thread.pointsTotal}</Text>
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 12.5, color: Colors.textDim, fontWeight: '500' }}>{thread.timeAgo}</Text>
      {!thread.locked && renderPreview(thread)}
    </Pressable>
  );
}
