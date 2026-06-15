import { apiFetch } from '@/lib/api';
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

export async function getUserProfile(): Promise<UserProfile | null> {
  return apiFetch<UserProfile>('/profile');
}

export async function upsertUserProfile(patch: ProfilePatch): Promise<UserProfile> {
  return apiFetch<UserProfile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

// GET auto-creates the row server-side if missing.
export async function ensureUserProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/profile');
}
