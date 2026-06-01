import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.fg,
        tabBarInactiveTintColor: Colors.fgSubtle,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="threads" options={{ title: 'Threads' }} />
    </Tabs>
  );
}
