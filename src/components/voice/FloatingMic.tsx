import { Pressable } from 'react-native';

import { Colors } from '@/constants/theme';
import { MicIcon } from '../icons';

export function FloatingMic({
  accent = Colors.accent,
  onPress,
  hidden,
  bottom = 96,
  right = 18,
}: {
  accent?: string;
  onPress: () => void;
  hidden?: boolean;
  bottom?: number;
  right?: number;
}) {
  if (hidden) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Start voice capture"
      onPress={onPress}
      style={{
        position: 'absolute',
        right,
        bottom,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MicIcon size={24} color="#fff" />
    </Pressable>
  );
}
