import { Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { AppHeader } from '../AppHeader';
import { SaarthiLogo } from '../SaarthiLogo';

export function PlaceholderView({
  title,
  subtitle,
  topInset = 52,
}: {
  title: string;
  subtitle: string;
  topInset?: number;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader title={title} topInset={topInset} />
      <View style={{ paddingHorizontal: 28, alignItems: 'center', marginTop: 40, gap: 12 }}>
        <SaarthiLogo size={56} />
        <Text
          style={{
            fontSize: 16, color: Colors.textDim, lineHeight: 24,
            fontWeight: '500', textAlign: 'center', maxWidth: 260,
          }}
        >
          {subtitle}
        </Text>
        <Text
          style={{
            fontSize: 11.5, color: Colors.textFaint, fontWeight: '600',
            letterSpacing: 1, textTransform: 'uppercase', marginTop: 8,
          }}
        >
          coming soon
        </Text>
      </View>
    </View>
  );
}
