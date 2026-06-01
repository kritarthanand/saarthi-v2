import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// PARKED: The new threads/today/chat shell ships against mock data in `src/lib/mockData.ts`.
// This module is kept so the next PR can wire RLS-scoped queries with no extra setup.
// Import lazily — `getSupabase()` only constructs the client on first use, so missing
// env vars no longer crash app boot. Remove the `throw`s + this whole file once the
// real data path lands (or vice versa: import this and delete the mock).

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
      storage: AsyncStorage,
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
