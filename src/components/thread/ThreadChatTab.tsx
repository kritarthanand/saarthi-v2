import { Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { THREAD_CHATS, type Thread } from '@/lib/mockData';

export function ThreadChatTab({ thread }: { thread: Thread }) {
  const theme = threadTheme(thread.tag);
  const base = thread.kind === 'note' ? thread.messages || [] : THREAD_CHATS[thread.id] || [];
  const messages = [...base, ...(thread.appendedMessages || [])];
  const tagName = thread.tag.replace('#', '');
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24, gap: 14 }}>
      <View
        style={{
          alignSelf: 'center',
          paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999,
          backgroundColor: theme.dim,
        }}
      >
        <Text style={{ color: theme.color, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
          {tagName} session
        </Text>
      </View>
      {messages.map((m, i) => {
        // Defensive fallback — every push now stamps `time`, but legacy mock data and
        // future Supabase rows may lack it; render an em-dash rather than literal `undefined`.
        const timeLabel = m.time ?? '—';
        return m.from === 'ai' ? (
          <View key={i} style={{ alignItems: 'flex-start', maxWidth: '88%', gap: 4 }}>
            <Text style={{ fontSize: 14.5, color: Colors.text, lineHeight: 20 }}>{m.text}</Text>
            <Text style={{ fontSize: 10.5, color: Colors.textFaint, fontWeight: '500' }}>
              {m.meta || tagName.toLowerCase()} · {timeLabel}
            </Text>
          </View>
        ) : (
          <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '78%', gap: 4, alignItems: 'flex-end' }}>
            {m.itemRef && (
              <View
                style={{
                  paddingVertical: 2, paddingHorizontal: 8,
                  borderRadius: 999,
                  backgroundColor: theme.dim,
                  maxWidth: '100%',
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10.5, color: theme.color, fontWeight: '700',
                    letterSpacing: 0.2,
                  }}
                >
                  re: {m.itemRef}
                </Text>
              </View>
            )}
            <View
              style={{
                backgroundColor: theme.color,
                paddingVertical: 9, paddingHorizontal: 14,
                borderRadius: 18, borderBottomRightRadius: 4,
                gap: 2, alignItems: 'flex-end',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '500' }}>{m.text}</Text>
              <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>{timeLabel}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
