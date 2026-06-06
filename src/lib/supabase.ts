import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';

// PARKED: The new threads/today/chat shell ships against mock data in `src/lib/mockData.ts`.
// This module is kept so the next PR can wire RLS-scoped queries with no extra setup.
// Import lazily — `getSupabase()` only constructs the client on first use, so missing
// env vars no longer crash app boot. Remove the `throw`s + this whole file once the
// real data path lands (or vice versa: import this and delete the mock).

// In worktrees (symlinked node_modules) AsyncStorage's native module isn't registered
// against the worktree's iOS build. Wrap it in a safe adapter that falls back to
// an in-memory store so the Supabase auth auto-refresh tick never throws.
const memoryStore: Record<string, string> = {};
const safeStorage: SupportedStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
  },
};

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }
  if (!supabaseAnonKey) {
    throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. Copy .env.example to .env and fill it in.');
  }

  cached = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: safeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}
