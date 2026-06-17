import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { MicIcon, SendIcon } from './icons';

export function Composer({
  placeholder = 'Message Saarthi…',
  onSend,
  onMic,
  accent = Colors.accent,
  hashtag,
  paddingBottom = 100,
  pendingText,
  onPendingTextConsumed,
}: {
  placeholder?: string;
  onSend?: (text: string) => void;
  onMic?: () => void;
  accent?: string;
  hashtag?: string;
  paddingBottom?: number;
  /**
   * When a non-empty string lands here (e.g. a transcribed voice clip), the
   * Composer appends it to the current input value (no auto-send — the user
   * can still edit). The parent should clear it via onPendingTextConsumed so
   * it doesn't keep re-inserting on every render.
   */
  pendingText?: string;
  onPendingTextConsumed?: () => void;
}) {
  const [val, setVal] = useState('');
  useEffect(() => {
    if (!pendingText) return;
    setVal((prev) => (prev ? `${prev} ${pendingText}` : pendingText));
    onPendingTextConsumed?.();
  }, [pendingText, onPendingTextConsumed]);
  // The Composer is `position: absolute` so iOS doesn't reflow it when the keyboard
  // appears. Track the keyboard inset manually and pad the bottom by it; KAV doesn't
  // mix well with absolute children.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const send = () => {
    const trimmed = val.trim();
    if (!trimmed || !onSend) return;
    onSend(trimmed);
    setVal('');
  };
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: kbHeight > 0 ? kbHeight + 8 : paddingBottom,
        paddingTop: 12,
        paddingHorizontal: 14,
        backgroundColor: Colors.bg,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
      }}
    >
      {hashtag && (
        <Text style={{ marginBottom: 8, paddingLeft: 4, fontSize: 11.5, color: Colors.textFaint, fontWeight: '500' }}>
          replying in <Text style={{ color: accent, fontWeight: '600' }}>{hashtag}</Text>
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingLeft: 16,
            paddingRight: 6,
            paddingVertical: 6,
            backgroundColor: Colors.bgCardElev,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <TextInput
            value={val}
            onChangeText={setVal}
            placeholder={placeholder}
            placeholderTextColor={Colors.textFaint}
            onSubmitEditing={send}
            returnKeyType="send"
            style={{ flex: 1, color: Colors.text, fontSize: 15, paddingVertical: 8 }}
          />
          {val.trim().length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              onPress={send}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: accent,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <SendIcon size={16} />
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch to voice"
          onPress={onMic}
          style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: accent,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <MicIcon size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
