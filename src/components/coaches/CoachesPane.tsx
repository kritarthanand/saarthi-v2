import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Colors } from '@/constants/theme';
import { COACHES, type CoachId } from '@/constants/pandavas';

export function CoachesPane({
  selectedCoachId,
  onSelectCoach,
  topInset = 52,
}: {
  selectedCoachId: CoachId | null;
  onSelectCoach: (id: CoachId) => void;
  topInset?: number;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader title="Coaches" topInset={topInset} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 4 }}
      >
        <Text
          style={{
            fontSize: 14,
            color: Colors.textDim,
            lineHeight: 20,
            marginBottom: 18,
          }}
        >
          Five Pandava brothers, five coaches — each owning one domain of the life you’re
          building. Tap a brother to see his spirit, his daily sadhanas, and what he wants
          you to celebrate.
        </Text>

        <View style={{ gap: 10 }}>
          {COACHES.map((coach) => {
            const isSelected = coach.id === selectedCoachId;
            return (
              <Pressable
                key={coach.id}
                onPress={() => onSelectCoach(coach.id)}
                accessibilityRole="button"
                accessibilityLabel={`${coach.name}, ${coach.domain}`}
                accessibilityState={{ selected: isSelected }}
                style={{
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isSelected ? coach.accent : Colors.border,
                  backgroundColor: isSelected ? coach.accentDim : Colors.bgCard,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* Color chip — visual anchor for the coach's accent. */}
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: coach.accentDim,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18, color: coach.accent, fontWeight: '700' }}>
                      {coach.name[0]}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '700',
                        color: Colors.text,
                        letterSpacing: -0.2,
                      }}
                    >
                      {coach.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: Colors.textDim,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {coach.domain}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 11,
                      color: coach.accent,
                      fontWeight: '600',
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                    }}
                    numberOfLines={1}
                  >
                    {coach.spirit}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
