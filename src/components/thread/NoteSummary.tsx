import { Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { Thread } from '@/lib/mockData';

export function NoteSummary({ thread }: { thread: Thread }) {
  const theme = threadTheme(thread.tag);
  const userMsgs = (thread.messages || []).filter((m) => m.from === 'me');
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4, paddingBottom: 24, gap: 14 }}>
      <View
        style={{
          backgroundColor: theme.dim,
          borderColor: Colors.border, borderWidth: 1, borderRadius: 22,
          padding: 18, gap: 8,
        }}
      >
        <Text style={{ fontSize: 11, color: theme.color, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
          captured · {Math.floor(thread.elapsed || 0)}s
        </Text>
        <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '500', lineHeight: 21 }}>
          A note for later. {userMsgs.length} thoughts saved — come back anytime.
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', padding: 4 }}>
        thoughts
      </Text>
      {userMsgs.map((m, i) => (
        <View
          key={i}
          style={{
            paddingVertical: 12, paddingHorizontal: 14,
            backgroundColor: Colors.bgCard,
            borderColor: Colors.border, borderWidth: 1, borderRadius: 14,
            borderLeftWidth: 2, borderLeftColor: theme.color,
          }}
        >
          <Text style={{ fontSize: 14, color: Colors.text, lineHeight: 20, fontWeight: '500' }}>{m.text}</Text>
        </View>
      ))}
      {userMsgs.length === 0 && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: Colors.textFaint, fontSize: 13 }}>empty note · tap the mic to add to it</Text>
        </View>
      )}
    </View>
  );
}
