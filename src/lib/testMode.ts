import AsyncStorage from '@react-native-async-storage/async-storage';

// V2 doesn't have a test-mode UX yet — V1's test-user signup flow hasn't
// been ported. This shim exists so the Profile screen's Sign Out path can
// call disableTestMode() symmetrically with V1; once test mode lands,
// flesh out the rest.

const TEST_MODE_KEY = 'saarthi_v2.test_mode';

export async function disableTestMode(): Promise<void> {
  await AsyncStorage.removeItem(TEST_MODE_KEY);
}
