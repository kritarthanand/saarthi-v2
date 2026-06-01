import { Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { SCORE_MAX, SCORE_TODAY, SCORE_TOTAL_WEEK, SCORE_WEEK } from '@/lib/mockData';

export function ScoreHeader() {
  const max = Math.max(...SCORE_WEEK.map((d) => d.score), 50);
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 14,
        paddingHorizontal: 16,
        backgroundColor: Colors.bgCard,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'column', gap: 4, minWidth: 0, flexShrink: 1 }}>
        <Text
          style={{
            fontSize: 10.5, color: Colors.textFaint, fontWeight: '700',
            letterSpacing: 1, textTransform: 'uppercase',
          }}
        >
          score
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ fontSize: 30, fontWeight: '700', color: Colors.text, letterSpacing: -0.6, lineHeight: 32 }}>
            {SCORE_TODAY}
          </Text>
          <Text style={{ fontSize: 13, color: Colors.textDim, fontWeight: '500', marginBottom: 4 }}>
            / {SCORE_MAX}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 13, color: Colors.textDim }}>☾</Text>
            <View style={{ width: 14, height: 2, backgroundColor: Colors.blue, borderRadius: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 12, color: Colors.textDim }}>👟</Text>
            <View style={{ width: 14, height: 2, backgroundColor: Colors.accent, borderRadius: 1 }} />
          </View>
          <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '500' }}>· wk {SCORE_TOTAL_WEEK}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 56 }}>
        {SCORE_WEEK.map((d, i) => {
          const h = Math.max(4, (d.score / max) * 56);
          const c = d.isToday ? Colors.green : 'rgba(63,191,127,0.6)';
          return (
            <View key={i} style={{ flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <View style={{ width: 7, height: h, backgroundColor: c, borderRadius: 2 }} />
              <Text
                style={{ fontSize: 9, color: d.isToday ? Colors.text : Colors.textFaint, fontWeight: '600' }}
              >
                {d.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
