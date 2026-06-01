import { getProxyUrl } from '@/lib/config';
import { getAccessToken } from '@/lib/supabase';
import type { ChatModelChoice, ChatModelOption } from '@/types/profile';

export const DEFAULT_CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  { id: 'gpt_4o',        label: '4-o',           provider: 'openai',    available: true,  fallback_id: 'gpt_4o' },
  { id: 'gpt_5_4',       label: 'gpt 5.4',       provider: 'openai',    available: true,  fallback_id: 'gpt_4o' },
  { id: 'claude_sonnet', label: 'Claude Sonnet', provider: 'anthropic', available: false, fallback_id: 'gpt_4o' },
  { id: 'claude_opus',   label: 'Claude Opus',   provider: 'anthropic', available: false, fallback_id: 'gpt_4o' },
];

const KNOWN_CHAT_MODEL_IDS: ReadonlySet<ChatModelChoice> = new Set([
  'gpt_4o',
  'gpt_5_4',
  'claude_sonnet',
  'claude_opus',
]);

// `preferred_chat_model` in v2_profiles is CHECK-constrained to the union
// above. If the server ever sends an unknown id (typo, new model added
// before the client catches up), letting it through would surface as a
// constraint error at upsert time — drop unknowns at the boundary instead.
function isValidOption(m: unknown): m is ChatModelOption {
  if (!m || typeof m !== 'object') return false;
  const o = m as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    KNOWN_CHAT_MODEL_IDS.has(o.id as ChatModelChoice) &&
    typeof o.label === 'string' &&
    (o.provider === 'openai' || o.provider === 'anthropic') &&
    typeof o.available === 'boolean' &&
    typeof o.fallback_id === 'string' &&
    KNOWN_CHAT_MODEL_IDS.has(o.fallback_id as ChatModelChoice)
  );
}

// Server endpoint doesn't exist yet (V2 server is /health only). When the
// fetch fails or 404s, fall back to DEFAULT_CHAT_MODEL_OPTIONS rather than
// throwing — the picker still renders something sensible.
export async function getChatModelOptions(): Promise<ChatModelOption[]> {
  try {
    const proxyUrl = await getProxyUrl();
    const token = await getAccessToken();
    const response = await fetch(`${proxyUrl}/providers/models`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return DEFAULT_CHAT_MODEL_OPTIONS;
    const payload = (await response.json()) as { models?: unknown };
    if (!Array.isArray(payload?.models)) return DEFAULT_CHAT_MODEL_OPTIONS;
    const validated = payload.models.filter(isValidOption);
    return validated.length > 0 ? validated : DEFAULT_CHAT_MODEL_OPTIONS;
  } catch {
    return DEFAULT_CHAT_MODEL_OPTIONS;
  }
}
