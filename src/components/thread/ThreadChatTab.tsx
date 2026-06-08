import { Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { Thread, ThreadMessage } from '@/lib/threads';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ThreadChatTab({
  thread,
  messages,
}: {
  thread: Thread;
  messages: ThreadMessage[];
}) {
  const theme = threadTheme(thread.tag);
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
      {messages.map((m) => {
        const timeLabel = fmtTime(m.created_at);
        const metaTag = typeof m.meta?.tag === 'string' ? m.meta.tag : tagName.toLowerCase();
        return m.role === 'ai' ? (
          <View key={m.id} style={{ alignItems: 'flex-start', maxWidth: '88%', gap: 4 }}>
            <Text style={{ fontSize: 14.5, color: Colors.text, lineHeight: 20 }}>{m.content}</Text>
            <Text style={{ fontSize: 10.5, color: Colors.textFaint, fontWeight: '500' }}>
              {metaTag} · {timeLabel}
            </Text>
          </View>
        ) : (
          <View key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '78%', gap: 4, alignItems: 'flex-end' }}>
            {m.task_ref && (
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
                  re: {m.task_ref}
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
              <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '500' }}>{m.content}</Text>
              <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>{timeLabel}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
