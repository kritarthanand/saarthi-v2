import { Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { SaarthiLogo } from '../SaarthiLogo';

export function EmptyDetail() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: Colors.bg }}>
      <View style={{ opacity: 0.5 }}>
        <SaarthiLogo size={64} />
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 17, color: Colors.textDim, fontWeight: '600', letterSpacing: -0.2 }}>
          Pick a thread
        </Text>
        <Text
          style={{
            fontSize: 14, color: Colors.textFaint, fontWeight: '500',
            maxWidth: 260, textAlign: 'center', lineHeight: 21,
          }}
        >
          Open any thread to see its summary and conversation side by side.
        </Text>
      </View>
    </View>
  );
}
