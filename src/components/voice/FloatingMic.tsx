import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import { Colors } from '@/constants/theme';
import { MicIcon } from '../icons';

export function FloatingMic({
  accent = Colors.accent,
  onPress,
  onLongPress,
  hidden,
  bottom = 96,
  right = 18,
}: {
  accent?: string;
  onPress: () => void;
  /**
   * Long-press opens the Pandava picker. Note this is a *long* press, not a
   * force press: 3D Touch is deprecated hardware, and Haptic Touch — which is
   * what current iPhones actually do — surfaces to RN as onLongPress.
   */
  onLongPress?: () => void;
  hidden?: boolean;
  bottom?: number;
  right?: number;
}) {
  if (hidden) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Start voice capture"
      accessibilityHint={onLongPress ? 'Press and hold to pick a coach to talk to' : undefined}
      onPress={onPress}
      onLongPress={
        onLongPress
          ? () => {
              // Fire-and-forget: haptics are unavailable on web and in the
              // simulator, and a missing buzz shouldn't swallow the gesture.
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onLongPress();
            }
          : undefined
      }
      delayLongPress={350}
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
