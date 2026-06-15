import type React from 'react';
import { Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { SaarthiLogo } from './SaarthiLogo';

export function AppHeader({
  title,
  right,
  topInset = 52,
}: {
  title: string;
  right?: string | React.ReactNode;
  topInset?: number;
}) {
  return (
    <View
      style={{
        paddingTop: topInset,
        paddingHorizontal: 20,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SaarthiLogo size={28} />
        <Text style={{ fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 }}>
          {title}
        </Text>
      </View>
      {right != null ? (
        typeof right === 'string' ? (
          <Text style={{ fontSize: 13, color: Colors.textDim, fontWeight: '500' }}>{right}</Text>
        ) : (
          right
        )
      ) : null}
    </View>
  );
}
