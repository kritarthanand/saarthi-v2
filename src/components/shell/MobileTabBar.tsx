import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { TabChatIcon, TabProfileIcon, TabTodayIcon, TabWeekIcon } from '../icons';
import type { TabId } from './Sidebar';

const TABS: { id: TabId; label: string; icon: React.FC<{ active: boolean; color: string }> }[] = [
  { id: 'today', label: 'Today', icon: TabTodayIcon },
  { id: 'week', label: 'Week', icon: TabWeekIcon },
  { id: 'chat', label: 'Chat', icon: TabChatIcon },
  { id: 'profile', label: 'Profile', icon: TabProfileIcon },
];

export function MobileTabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        paddingBottom: Math.max(insets.bottom, 12) + 16,
        paddingTop: 8,
        backgroundColor: Colors.bg,
        borderTopColor: Colors.border, borderTopWidth: 1,
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
      }}
    >
      {TABS.map((t) => {
        const isA = active === t.id;
        const c = isA ? Colors.text : Colors.textFaint;
        const Icon = t.icon;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: isA }}
            onPress={() => onChange(t.id)}
            style={{ paddingVertical: 4, paddingHorizontal: 10, alignItems: 'center', gap: 2 }}
          >
            <Icon active={isA} color={c} />
            <Text style={{ fontSize: 10.5, color: c, fontWeight: isA ? '600' : '500' }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
