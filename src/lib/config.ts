import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import type { VoiceTransportMode } from '@/types/profile';

const PROXY_URL_KEY = 'saarthi_v2.proxy_url';
const VOICE_TRANSPORT_KEY = 'saarthi_v2.voice_transport';

const LOCAL_PROXY_URL = 'http://localhost:3001';
const REMOTE_PROXY_URL =
  (Constants.expoConfig?.extra?.proxyUrl as string | undefined) ??
  'https://api.kritarthanand.com';

const DEFAULT_PROXY_URL: string = __DEV__ ? LOCAL_PROXY_URL : REMOTE_PROXY_URL;

export function getDefaultProxyUrl(): string {
  return DEFAULT_PROXY_URL;
}

export async function getProxyUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(PROXY_URL_KEY);
    return stored && stored.trim() ? stored : DEFAULT_PROXY_URL;
  } catch (e) {
    // AsyncStorage throws "Native module is null" when running in a worktree
    // with symlinked node_modules (the iOS native binary is registered against
    // the main repo's build) — fall back so the UI can still hit the dev API.
    console.warn('getProxyUrl: AsyncStorage unavailable, using default', e);
    return DEFAULT_PROXY_URL;
  }
}

export async function setProxyUrl(url: string): Promise<void> {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) {
    await AsyncStorage.removeItem(PROXY_URL_KEY);
    return;
  }
  await AsyncStorage.setItem(PROXY_URL_KEY, trimmed);
}

// Voice transport is intentionally device-local, per the Profile screen
// spec. The choice depends on the device's network/codec characteristics
// (e.g. a flaky cellular connection might prefer streaming_fallback), so
// syncing it across devices via v2_profiles would hurt more than help.
// If multi-device parity ever becomes a goal, promote this to a column on
// v2_profiles and backfill from AsyncStorage on first launch.
export async function getVoiceTransportMode(): Promise<VoiceTransportMode> {
  const stored = await AsyncStorage.getItem(VOICE_TRANSPORT_KEY);
  if (stored === 'server_streaming' || stored === 'streaming_fallback') return stored;
  return 'auto';
}

export async function setVoiceTransportMode(mode: VoiceTransportMode): Promise<void> {
  await AsyncStorage.setItem(VOICE_TRANSPORT_KEY, mode);
}
