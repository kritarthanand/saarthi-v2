import '@/global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

// TODO(routing): on web, the design's four "tabs" (today/week/chat/profile) and the
// open-thread selection are held in component state inside `src/app/index.tsx`. That means
// no deep linking, no browser back/forward, and refresh always lands on Today + the
// default-open thread. Once we add real screens, model these as `expo-router` routes
// (`/today`, `/chat/:threadId`, etc.) so URL ⇄ state stays bidirectional.

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            // Without this the Stack falls back to react-navigation's light-theme card background
            // and you can see a white flash between screen transitions.
            contentStyle: { backgroundColor: Colors.bg },
          }}
        >
          <Stack.Screen name="index" />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
