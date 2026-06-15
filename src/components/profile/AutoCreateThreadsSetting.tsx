import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

import { threadTheme } from '@/constants/theme';
import { TEMPLATE_REGISTRY } from '@/lib/threadTemplates';
import { upsertUserProfile } from '@/lib/profile';
import type { UserProfile } from '@/types/profile';

const ELIGIBLE_TEMPLATES = [
  'morning_ritual',
  'evening_ritual',
  'weekly_ritual',
  'meal_logging',
  'clean_ritual',
  'catch_up',
] as const;

type Props = {
  selected: string[];
  onUpdate: (profile: UserProfile) => void;
  onEnsureToday: () => void;
  disabled?: boolean;
};

export function AutoCreateThreadsSetting({ selected, onUpdate, onEnsureToday, disabled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [optimistic, setOptimistic] = useState<string[] | null>(null);

  const current = optimistic ?? selected;

  const summary =
    current.length === 0
      ? 'None'
      : current
          .map((t) => TEMPLATE_REGISTRY[t]?.title ?? t)
          .join(', ');

  async function toggle(template: string) {
    if (disabled) return;
    const next = current.includes(template)
      ? current.filter((t) => t !== template)
      : [...current, template];
    const prev = current;
    setOptimistic(next);
    try {
      const updated = await upsertUserProfile({ auto_create_templates: next });
      onUpdate(updated);
      setOptimistic(null);
      if (next.includes(template) && !prev.includes(template)) {
        onEnsureToday();
      }
    } catch (err) {
      console.warn('Failed to save auto-create templates:', err);
      setOptimistic(prev);
      Alert.alert("Couldn't save", "Your change wasn't saved. Please try again.");
    }
  }

  return (
    <View>
      <TouchableOpacity
        onPress={() => !disabled && setExpanded((e) => !e)}
        className="flex-row items-center justify-between py-2"
        accessibilityRole="button"
        accessibilityLabel="Auto-create on open"
        accessibilityState={{ expanded }}
      >
        <Text className="text-fg text-base">Auto-create on open</Text>
        <View className="flex-row items-center gap-2">
          {current.length === 0 ? (
            <Text className="text-fg-muted text-sm">None</Text>
          ) : (
            <View className="flex-row items-center gap-1 flex-shrink">
              {current.map((t, i) => {
                const config = TEMPLATE_REGISTRY[t];
                const theme = threadTheme(config?.tag ?? '');
                return (
                  <Text key={t} style={{ color: theme.color }} className="text-sm font-medium">
                    {i > 0 ? ',  ' : ''}{config?.title ?? t}
                  </Text>
                );
              })}
            </View>
          )}
          <Text className="text-fg-muted text-xs">{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-1 gap-2">
          {ELIGIBLE_TEMPLATES.map((template) => {
            const config = TEMPLATE_REGISTRY[template];
            if (!config) return null;
            const theme = threadTheme(config.tag);
            const checked = current.includes(template);
            return (
              <TouchableOpacity
                key={template}
                onPress={() => toggle(template)}
                className="flex-row items-center gap-3 py-2"
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={config.title}
              >
                <View
                  style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.color, shadowColor: theme.color, shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }}
                />
                <View className="flex-1">
                  <Text className="text-fg text-sm">{config.title}</Text>
                  <Text className="text-fg-muted text-xs capitalize">{config.cadence}</Text>
                </View>
                {checked && (
                  <Text style={{ color: theme.color }} className="text-sm font-semibold">
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
