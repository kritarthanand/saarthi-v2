import { Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, { fs: number; py: number; px: number; gap: number; dot: number }> = {
  sm: { fs: 12, py: 3, px: 8,  gap: 4, dot: 6 },
  md: { fs: 13, py: 5, px: 10, gap: 5, dot: 7 },
  lg: { fs: 15, py: 6, px: 12, gap: 6, dot: 8 },
  xl: { fs: 22, py: 0, px: 0,  gap: 8, dot: 10 },
};

export function Hashtag({
  tag,
  size = 'md',
  dimmed = false,
}: {
  tag: string;
  size?: Size;
  dimmed?: boolean;
}) {
  const theme = threadTheme(tag);
  const s = SIZES[size];
  const color = dimmed ? Colors.textDim : theme.color;
  const dotColor = dimmed ? Colors.textFaint : theme.color;

  if (size === 'xl') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.gap }}>
        <View style={{ width: s.dot, height: s.dot, borderRadius: s.dot / 2, backgroundColor: dotColor }} />
        <Text style={{ fontSize: s.fs, fontWeight: '700', letterSpacing: -0.2, color }}>{tag}</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.gap,
        paddingVertical: s.py,
        paddingHorizontal: s.px,
        borderRadius: 999,
        backgroundColor: dimmed ? 'rgba(255,255,255,0.04)' : theme.dim,
        alignSelf: 'flex-start',
      }}
    >
      <View style={{ width: s.dot, height: s.dot, borderRadius: s.dot / 2, backgroundColor: dotColor }} />
      <Text style={{ fontSize: s.fs, fontWeight: '600', letterSpacing: -0.1, color }}>{tag}</Text>
    </View>
  );
}
