import { getSupabase } from '@/lib/supabase';
import type { ProfilePatch, UserProfile } from '@/types/profile';

export const DEFAULT_PROFILE_VALUES: Omit<UserProfile, 'id' | 'updated_at'> = {
  name: '',
  bio: '',
  personality: 'stoic',
  preferred_chat_model: 'gpt_4o',
  tts_voice: 'nova',
  timezone: 'America/Los_Angeles',
  day_start_hour: 0,
  morning_deadline_hour: 12,
  evening_start_hour: 17,
  auto_create_templates: ['morning_ritual', 'evening_ritual'],
};

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser();
  return data.user?.id ?? null;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await getSupabase()
    .from('v2_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as UserProfile | null) ?? null;
}

// Upsert into v2_profiles. RLS scopes by auth.uid(), so we never need to
// supply id when authenticated. Returns the post-write row.
export async function upsertUserProfile(patch: ProfilePatch): Promise<UserProfile> {
  const userId = await getUserId();
  if (!userId) throw new Error('Cannot save profile: not signed in.');
  const row = { id: userId, ...patch };
  const { data, error } = await getSupabase()
    .from('v2_profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data as UserProfile;
}

// First-mount seed: returns the existing row, or inserts the defaults.
export async function ensureUserProfile(): Promise<UserProfile> {
  const existing = await getUserProfile();
  if (existing) return existing;
  return upsertUserProfile(DEFAULT_PROFILE_VALUES);
}
