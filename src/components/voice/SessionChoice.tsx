// Shown after each clip: keep talking, get a reply, or just leave it dumped.
//
// By the time this renders, every clip in the sitting is already persisted as a
// message (posted with reply=false). None of these three buttons can lose your
// recording — they only decide what happens next.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import type { Coach } from '@/constants/pandavas';
import { Colors } from '@/constants/theme';

export type ChoiceBusy = 'reply' | 'export' | null;

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
};

export function SessionChoice({
  coach,
  segmentCount,
  totalSeconds,
  lastTranscript,
  busy = null,
  error = null,
  onContinue,
  onRespond,
  onDump,
  topInset = 50,
  canExport = true,
}: {
  coach: Coach;
  segmentCount: number;
  totalSeconds: number;
  lastTranscript: string;
  busy?: ChoiceBusy;
  error?: string | null;
  onContinue: () => void;
  onRespond: () => void;
  onDump: () => void;
  topInset?: number;
  /** False for a sitting inside a non-voice thread: nothing to write out. */
  canExport?: boolean;
}) {
  const locked = busy !== null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View
        style={{
          paddingTop: topInset, paddingHorizontal: 20, paddingBottom: 14,
          borderBottomColor: Colors.border, borderBottomWidth: 1,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}
      >
        <View
          style={{
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: coach.accentDim,
            borderWidth: 1.5, borderColor: coach.accent,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: coach.accent, fontSize: 16, fontWeight: '700' }}>
            {coach.name.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '700' }}>
            {coach.name}
          </Text>
          <Text style={{ color: Colors.textFaint, fontSize: 11.5, fontWeight: '500' }}>
            {segmentCount} clip{segmentCount === 1 ? '' : 's'} · {fmtDuration(totalSeconds)} · saved
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      >
        <Text
          style={{
            color: Colors.textFaint, fontSize: 11, fontWeight: '700',
            letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8,
          }}
        >
          Last clip
        </Text>
        <View
          style={{
            backgroundColor: Colors.bgCard, borderRadius: 16,
            borderWidth: 1, borderColor: Colors.border,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: lastTranscript ? Colors.textDim : Colors.textFaint,
              fontSize: 14.5, lineHeight: 21,
              fontStyle: lastTranscript ? 'normal' : 'italic',
            }}
          >
            {lastTranscript || 'Nothing came through on that one.'}
          </Text>
        </View>

        {error && (
          <View
            style={{
              marginTop: 14, padding: 12, borderRadius: 12,
              backgroundColor: 'rgba(255,77,77,0.10)',
              borderWidth: 1, borderColor: 'rgba(255,77,77,0.35)',
            }}
          >
            <Text style={{ color: Colors.danger, fontSize: 12.5 }}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 30, gap: 10 }}>
        <ChoiceButton
          label="Keep talking"
          detail="Another two minutes with the same thread"
          color={coach.accent}
          filled
          disabled={locked}
          onPress={onContinue}
        />
        <ChoiceButton
          label={`Ask ${coach.name} to respond`}
          detail="One reply to everything you just said"
          color={coach.accent}
          disabled={locked}
          loading={busy === 'reply'}
          onPress={onRespond}
        />
        <ChoiceButton
          label="Just leave it"
          detail={
            canExport
              ? 'Dump it to your daily note without a reply'
              : `Keep the clips on ${coach.name}'s thread, no reply`
          }
          color={Colors.textDim}
          disabled={locked}
          loading={busy === 'export'}
          onPress={onDump}
        />
      </View>
    </View>
  );
}

function ChoiceButton({
  label,
  detail,
  color,
  filled = false,
  disabled = false,
  loading = false,
  onPress,
}: {
  label: string;
  detail: string;
  color: string;
  filled?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  // Press feedback is driven by state rather than Pressable's `style={({pressed}) => …}`
  // callback form: under this Expo 56 / NativeWind setup a function `style` on a
  // Pressable in this subtree renders an empty view — no background, no children.
  // Verified in the simulator: identical markup with a static style object renders
  // correctly, and it reproduces with the React Compiler disabled.
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16,
        backgroundColor: filled ? color : Colors.bgCardElev,
        borderWidth: filled ? 0 : 1,
        borderColor: Colors.border,
        opacity: disabled && !loading ? 0.4 : pressed ? 0.75 : 1,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: filled ? '#fff' : Colors.text,
            fontSize: 15, fontWeight: '700',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: filled ? 'rgba(255,255,255,0.72)' : Colors.textFaint,
            fontSize: 11.5, marginTop: 2, fontWeight: '500',
          }}
        >
          {detail}
        </Text>
      </View>
      {loading && <ActivityIndicator size="small" color={filled ? '#fff' : color} />}
    </Pressable>
  );
}
