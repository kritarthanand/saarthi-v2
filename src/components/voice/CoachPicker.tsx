// Shown on a long-press of the mic: pick which Pandava you want to talk to.
//
// Everything rendered here already exists in COACHES — name, domain, accent —
// so this is pure presentation over the registry, with no new data layer.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { COACHES, type CoachId } from '@/constants/pandavas';
import { Colors } from '@/constants/theme';

export function CoachPicker({
  onSelect,
  onCancel,
  topInset = 0,
  embedded = false,
}: {
  onSelect: (coachId: CoachId) => void;
  onCancel: () => void;
  topInset?: number;
  /** Rendered inside the iPad/web card rather than a full-screen phone modal. */
  embedded?: boolean;
}) {
  // Measure the sheet itself, not the window: on iPad this renders inside a
  // fixed 440pt card, so useWindowDimensions() reported the full 834pt window
  // and picked the five-across row layout, which then clipped the last coach.
  const [width, setWidth] = useState(0);
  // See the note in ./SessionChoice.tsx: Pressable's `style={({pressed}) => …}`
  // callback form is dropped in this app, which silently flattened these rows
  // into a column (avatar above the name instead of beside it).
  const [pressedId, setPressedId] = useState<string | null>(null);
  // Five across need ~92pt each; below that they stack into a scrollable column.
  // width === 0 on the first pass (pre-measure) — fall back to the column layout,
  // which fits anywhere, rather than risking a clipped row.
  const row = width >= 5 * 92 + 32;
  const size = row ? 66 : 56;

  return (
    <Pressable
      accessibilityLabel="Dismiss coach picker"
      onPress={onCancel}
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.72)',
        // Bottom sheet over the app on phone; centered in the card on iPad,
        // where pinning to the bottom just leaves dead black above it.
        justifyContent: embedded ? 'center' : 'flex-end',
        paddingTop: topInset,
      }}
    >
      <Pressable
        onPress={(e) => e.stopPropagation()}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          backgroundColor: Colors.bgElev,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 1,
          borderColor: Colors.borderStrong,
          paddingTop: 18,
          paddingBottom: 34,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <View
            style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: Colors.borderStrong, marginBottom: 14,
            }}
          />
          <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '700' }}>
            Who are you talking to?
          </Text>
          <Text style={{ color: Colors.textFaint, fontSize: 12, marginTop: 3 }}>
            Two minutes per clip · keep going as long as you like
          </Text>
        </View>

        <ScrollView
          horizontal={row}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            row
              ? { paddingVertical: 18, gap: 6, justifyContent: 'center', flexGrow: 1 }
              : { paddingVertical: 12 }
          }
        >
          {COACHES.map((coach) => (
            <Pressable
              key={coach.id}
              accessibilityRole="button"
              accessibilityLabel={`Talk to ${coach.name} about ${coach.domain}`}
              onPress={() => onSelect(coach.id)}
              onPressIn={() => setPressedId(coach.id)}
              onPressOut={() => setPressedId(null)}
              style={
                row
                  ? {
                      width: 92, alignItems: 'center', gap: 8,
                      paddingVertical: 8, opacity: pressedId === coach.id ? 0.6 : 1,
                    }
                  : {
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      paddingVertical: 10, paddingHorizontal: 6,
                      opacity: pressedId === coach.id ? 0.6 : 1,
                    }
              }
            >
              <View
                style={{
                  width: size, height: size, borderRadius: size / 2,
                  backgroundColor: coach.accentDim,
                  borderWidth: 1.5, borderColor: coach.accent,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: coach.accent, fontSize: size * 0.36, fontWeight: '700' }}>
                  {coach.name.charAt(0)}
                </Text>
              </View>
              <View style={row ? { alignItems: 'center' } : { flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: Colors.text, fontSize: 13.5, fontWeight: '600' }}
                >
                  {coach.name}
                </Text>
                <Text
                  numberOfLines={row ? 2 : 1}
                  style={{
                    color: Colors.textFaint, fontSize: 10.5, marginTop: 2,
                    textAlign: row ? 'center' : 'left',
                  }}
                >
                  {coach.domain}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={{
            marginTop: 6, paddingVertical: 13, borderRadius: 14,
            backgroundColor: Colors.bgCardElev, alignItems: 'center',
          }}
        >
          <Text style={{ color: Colors.textDim, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}
