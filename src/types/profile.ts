export type CoachPersonality = 'stoic' | 'hype' | 'zen';

export type TTSVoice =
  | 'alloy'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer';

export type ChatModelChoice =
  | 'gpt_4o'
  | 'gpt_5_4'
  | 'claude_sonnet'
  | 'claude_opus';

export interface ChatModelOption {
  id: ChatModelChoice;
  label: string;
  provider: 'openai' | 'anthropic';
  available: boolean;
  fallback_id: ChatModelChoice;
}

export type VoiceTransportMode =
  | 'auto'
  | 'server_streaming'
  | 'streaming_fallback';

// Mirrors the v2_profiles row. `updated_at` is the Supabase-issued ISO
// timestamp string; cast with new Date() when you need a Date.
export interface UserProfile {
  id: string;
  name: string;
  bio: string;
  personality: CoachPersonality;
  preferred_chat_model: ChatModelChoice;
  tts_voice: TTSVoice;
  timezone: string;
  day_start_hour: number;
  morning_deadline_hour: number;
  evening_start_hour: number;
  // Scheduled templates to auto-create each day/week when the app opens.
  auto_create_templates: string[];
  updated_at: string;
}

export type ProfilePatch = Partial<Omit<UserProfile, 'id' | 'updated_at'>>;
