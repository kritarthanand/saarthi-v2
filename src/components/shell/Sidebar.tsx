import { Pressable, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { TabChatIcon, TabProfileIcon, TabTodayIcon, TabWeekIcon } from '../icons';
import { SaarthiLogo } from '../SaarthiLogo';

export type TabId = 'today' | 'week' | 'chat' | 'profile';

const TABS: { id: TabId; label: string; icon: React.FC<{ active: boolean; color: string }> }[] = [
  { id: 'today', label: 'Today', icon: TabTodayIcon },
  { id: 'week', label: 'Week', icon: TabWeekIcon },
  { id: 'chat', label: 'Chat', icon: TabChatIcon },
  { id: 'profile', label: 'Profile', icon: TabProfileIcon },
];

export function Sidebar({
  variant,
  active,
  onChange,
}: {
  variant: 'web' | 'ipad';
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  const wide = variant === 'web';
  return (
    <View
      style={{
        width: wide ? 232 : 84,
        backgroundColor: Colors.bgElev,
        borderRightColor: Colors.border,
        borderRightWidth: 1,
        paddingVertical: 26,
        paddingHorizontal: wide ? 16 : 0,
        gap: 6,
      }}
    >
      {/* Brand */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          paddingHorizontal: wide ? 8 : 0,
          paddingBottom: 22,
          justifyContent: wide ? 'flex-start' : 'center',
        }}
      >
        <SaarthiLogo size={30} />
        {wide && (
          <Text style={{ fontSize: 21, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 }}>Saarthi</Text>
        )}
      </View>

      {/* Nav */}
      {TABS.map((t) => {
        const isA = active === t.id;
        const c = isA ? Colors.text : Colors.textFaint;
        const Icon = t.icon;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              justifyContent: wide ? 'flex-start' : 'center',
              paddingVertical: wide ? 11 : 12,
              paddingHorizontal: wide ? 12 : 0,
              marginHorizontal: wide ? 0 : 14,
              borderRadius: 12,
              backgroundColor: isA ? Colors.bgCardElev : 'transparent',
            }}
          >
            <Icon active={isA} color={c} />
            {wide && (
              <Text style={{ fontSize: 14.5, color: c, fontWeight: isA ? '600' : '500' }}>{t.label}</Text>
            )}
          </Pressable>
        );
      })}

      <View style={{ flex: 1 }} />

      {/* Profile chip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: wide ? 8 : 0,
          justifyContent: wide ? 'flex-start' : 'center',
        }}
      >
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent }} />
        {wide && (
          <View style={{ minWidth: 0 }}>
            <Text style={{ fontSize: 13, color: Colors.text, fontWeight: '600' }}>Arjun</Text>
            <Text style={{ fontSize: 11, color: Colors.textFaint }}>day 12 streak</Text>
          </View>
        )}
      </View>
    </View>
  );
}
