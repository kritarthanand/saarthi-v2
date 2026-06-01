import { Pressable } from 'react-native';

import { Colors } from '@/constants/theme';
import { CheckIcon } from './icons';

export function Checkbox({
  checked,
  color = Colors.green,
  onPress,
  size = 22,
}: {
  checked: boolean;
  color?: string;
  onPress?: () => void;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: checked ? 0 : 1.6,
        borderColor: Colors.borderStrong,
        backgroundColor: checked ? color : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <CheckIcon size={size * 0.62} color="#fff" />}
    </Pressable>
  );
}
