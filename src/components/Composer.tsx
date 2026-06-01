import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { MicIcon, SendIcon } from './icons';

export function Composer({
  placeholder = 'Message Saarthi…',
  onSend,
  onMic,
  accent = Colors.accent,
  hashtag,
  paddingBottom = 100,
}: {
  placeholder?: string;
  onSend?: (text: string) => void;
  onMic?: () => void;
  accent?: string;
  hashtag?: string;
  paddingBottom?: number;
}) {
  const [val, setVal] = useState('');
  const send = () => {
    if (!val.trim()) return;
    onSend?.(val);
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
        paddingBottom,
        paddingTop: 12,
        paddingHorizontal: 14,
        backgroundColor: 'transparent',
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
