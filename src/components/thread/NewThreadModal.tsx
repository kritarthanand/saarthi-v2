import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { useCreateThread, useUpsertOccurrence } from '@/lib/threads.hooks';
import { TEMPLATE_REGISTRY } from '@/lib/threadTemplates';

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  morning_ritual:  'Health, ritual, and mindset — every morning',
  evening_ritual:  'Wind down, reflect, and plan tomorrow',
  weekly_ritual:   'Review last week and plan the one ahead',
  freeform:        'Open thread — chat, think, explore anything',
  meal_logging:    'Track what you eat across the day',
  workout_logging: 'Log a session from warm-up to cool-down',
  focus_time:      'A structured deep work session',
  clean_ritual:    'Your weekly space reset',
  catch_up:        'Check in with the people that matter',
};

const CADENCE_LABEL: Record<string, string> = {
  daily:  'daily',
  weekly: 'weekly',
  none:   'on-demand',
};

export function NewThreadModal({
  onClose,
  onCreated,
  topInset = 52,
}: {
  onClose: () => void;
  onCreated: (threadId: string) => void;
  topInset?: number;
}) {
  const { width } = useWindowDimensions();
  const isCompact = width < 820;

  const [creating, setCreating] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const createThread = useCreateThread();
  const upsertOccurrence = useUpsertOccurrence();

  const handleSelect = async (templateKey: string) => {
    if (creating) return;
    const config = TEMPLATE_REGISTRY[templateKey];
    if (!config) return;

    setCreating(templateKey);
    setErrorMsg(null);
    try {
      let threadId: string;
      if (config.creation === 'api') {
        const thread = await createThread(templateKey);
        threadId = thread.id;
      } else {
        const { thread } = await upsertOccurrence(templateKey);
        threadId = thread.id;
      }
      onCreated(threadId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMsg(msg);
      setCreating(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: topInset,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text style={{ fontSize: isCompact ? 22 : 26, fontWeight: '700', color: Colors.text, letterSpacing: -0.4 }}>
          New Thread
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          style={{
            width: isCompact ? 32 : 36, height: isCompact ? 32 : 36, borderRadius: isCompact ? 16 : 18,
            backgroundColor: Colors.bgCard,
            borderColor: Colors.border, borderWidth: 1,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: Colors.textDim, lineHeight: 22 }}>×</Text>
        </Pressable>
      </View>

      {/* Error banner */}
      {errorMsg && (
        <View
          style={{
            marginHorizontal: 16, marginTop: 12,
            padding: 12, borderRadius: 10,
            backgroundColor: 'rgba(255,77,77,0.12)',
            borderColor: 'rgba(255,77,77,0.3)', borderWidth: 1,
          }}
        >
          <Text style={{ fontSize: 13, color: '#FF4D4D', lineHeight: 18 }}>{errorMsg}</Text>
        </View>
      )}

      {/* Template list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isCompact ? 16 : 20, gap: isCompact ? 10 : 14 }}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(TEMPLATE_REGISTRY).map(([key, config]) => {
          const theme = threadTheme(config.tag);
          const isLoading = creating === key;
          return (
            <Pressable
              key={key}
              onPress={() => handleSelect(key)}
              disabled={!!creating}
              accessibilityRole="button"
              accessibilityLabel={`Create ${config.title} thread`}
              style={({ pressed }) => ({
                backgroundColor: pressed && !creating ? Colors.bgCardElev : Colors.bgCard,
                borderColor: Colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: isCompact ? 16 : 20,
                flexDirection: 'row',
                gap: isCompact ? 14 : 18,
                alignItems: 'center',
                opacity: creating && !isLoading ? 0.4 : 1,
              })}
            >
              {/* Color swatch */}
              <View
                style={{
                  width: isCompact ? 44 : 54, height: isCompact ? 44 : 54,
                  borderRadius: isCompact ? 12 : 14,
                  backgroundColor: theme.dim,
                  borderColor: theme.color + '40', borderWidth: 1,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: isCompact ? 20 : 26, color: theme.color }}>{theme.glyph}</Text>
              </View>

              {/* Content */}
              <View style={{ flex: 1, gap: isCompact ? 3 : 5 }}>
                <Text style={{ fontSize: isCompact ? 15 : 17, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 }}>
                  {config.title}
                </Text>
                <Text style={{ fontSize: isCompact ? 12.5 : 14, color: Colors.textDim, lineHeight: isCompact ? 17 : 20 }}>
                  {TEMPLATE_DESCRIPTIONS[key] ?? ''}
                </Text>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: isCompact ? 3 : 4,
                    paddingVertical: isCompact ? 3 : 4, paddingHorizontal: isCompact ? 8 : 10,
                    borderRadius: 999,
                    backgroundColor: theme.color + '18',
                    borderColor: theme.color + '35', borderWidth: 1,
                  }}
                >
                  <Text style={{ fontSize: isCompact ? 10.5 : 12, fontWeight: '700', color: theme.color, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {CADENCE_LABEL[config.cadence]}
                  </Text>
                </View>
              </View>

              {/* State indicator */}
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.color} />
              ) : (
                <Text style={{ fontSize: isCompact ? 20 : 24, color: Colors.textFaint, lineHeight: isCompact ? 24 : 28 }}>›</Text>
              )}
            </Pressable>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
