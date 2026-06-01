import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import {
  CardPicker,
  ChipPicker,
  HourPicker,
  SettingsRow,
  SettingsSection,
  StatusBadge,
  type SaveStatus,
} from '@/components/settings';
import { Colors } from '@/constants/theme';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import {
  DEFAULT_CHAT_MODEL_OPTIONS,
  getChatModelOptions,
} from '@/lib/chatModels';
import {
  getDefaultProxyUrl,
  getProxyUrl,
  getVoiceTransportMode,
  setProxyUrl,
  setVoiceTransportMode,
} from '@/lib/config';
import {
  DEFAULT_PROFILE_VALUES,
  ensureUserProfile,
  upsertUserProfile,
} from '@/lib/profile';
import { getSupabase } from '@/lib/supabase';
import { disableTestMode } from '@/lib/testMode';
import type {
  ChatModelChoice,
  ChatModelOption,
  CoachPersonality,
  ProfilePatch,
  TTSVoice,
  UserProfile,
  VoiceTransportMode,
} from '@/types/profile';

const PERSONALITIES = [
  { value: 'stoic' as CoachPersonality, label: 'Stoic', description: 'Calm, direct, grounded in principles' },
  { value: 'hype'  as CoachPersonality, label: 'Hype',  description: 'Energetic, loud wins, action-oriented' },
  { value: 'zen'   as CoachPersonality, label: 'Zen',   description: 'Gentle, reflective, mindful' },
];

const VOICES: ReadonlyArray<{ label: string; value: TTSVoice }> = [
  { label: 'Alloy',   value: 'alloy'   },
  { label: 'Echo',    value: 'echo'    },
  { label: 'Fable',   value: 'fable'   },
  { label: 'Onyx',    value: 'onyx'    },
  { label: 'Nova',    value: 'nova'    },
  { label: 'Shimmer', value: 'shimmer' },
];

const VOICE_TRANSPORTS = [
  { value: 'auto' as VoiceTransportMode,               label: 'Auto',               description: 'Try server streaming first, then fall back to the stable streaming pipeline if needed.' },
  { value: 'server_streaming' as VoiceTransportMode,   label: 'Server streaming',   description: 'Upload audio once and stream transcript, text, and audio chunks back progressively.' },
  { value: 'streaming_fallback' as VoiceTransportMode, label: 'Streaming fallback', description: 'Use the stable transcribe + SSE + TTS path.' },
];

const TIMEZONES = [
  { label: 'Pacific',   value: 'America/Los_Angeles' },
  { label: 'Mountain',  value: 'America/Denver' },
  { label: 'Central',   value: 'America/Chicago' },
  { label: 'Eastern',   value: 'America/New_York' },
  { label: 'London',    value: 'Europe/London' },
  { label: 'Paris',     value: 'Europe/Paris' },
  { label: 'Dubai',     value: 'Asia/Dubai' },
  { label: 'Mumbai',    value: 'Asia/Kolkata' },
  { label: 'Bangkok',   value: 'Asia/Bangkok' },
  { label: 'Singapore', value: 'Asia/Singapore' },
  { label: 'Tokyo',     value: 'Asia/Tokyo' },
  { label: 'Sydney',    value: 'Australia/Sydney' },
];

const DAY_START_HOURS        = [0, 1, 2, 3, 4, 5, 6, 7];
const MORNING_DEADLINE_HOURS = [9, 10, 11, 12, 13, 14];
const EVENING_START_HOURS    = [17, 18, 19, 20, 21, 22, 23];

const PROXY_ERROR_AUTOCLEAR_MS = 3000;
const SAVED_BADGE_HOLD_MS      = 1500;

// Standalone Profile screen, rendered inside AppRoot's `tab === 'profile'`
// branch (replacing the placeholder). No SafeAreaView here — the AppRoot
// already accounts for safe-area insets via `topInset`.
export function ProfilePane({ topInset = 52 }: { topInset?: number }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [chatModelOptions, setChatModelOptions] =
    useState<ChatModelOption[]>(DEFAULT_CHAT_MODEL_OPTIONS);

  const [nameText, setNameText] = useState('');
  const [bioText,  setBioText]  = useState('');

  const [proxyUrlText, setProxyUrlText] = useState('');
  const [proxyStatus,  setProxyStatus]  = useState<SaveStatus>('idle');

  const [voiceTransport, setVoiceTransportState] =
    useState<VoiceTransportMode>('auto');

  const [fieldStatus, setFieldStatus] =
    useState<Partial<Record<keyof UserProfile, SaveStatus>>>({});

  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = profile;

  const proxyErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nameSave = useDebouncedSave(nameText, {
    onSave: (v) => savePatch({ name: v }, 'name'),
  });
  const bioSave = useDebouncedSave(bioText, {
    onSave: (v) => savePatch({ bio: v }, 'bio'),
  });

  const nameStatusRef = useRef<SaveStatus>('idle');
  const bioStatusRef  = useRef<SaveStatus>('idle');
  nameStatusRef.current = nameSave.status;
  bioStatusRef.current  = bioSave.status;

  // Single mount-time load. The pane lives inside AppRoot and doesn't
  // unmount between tab switches, so a focus-effect-style re-fetch isn't
  // available; the trade-off is that other-device edits won't be reflected
  // until the user reloads the app. Once expo-router routes land (per the
  // TODO in app/_layout.tsx) swap this for useFocusEffect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [url, transport, models, prof] = await Promise.all([
          getProxyUrl(),
          getVoiceTransportMode(),
          getChatModelOptions(),
          ensureUserProfile(),
        ]);
        if (cancelled) return;
        setProxyUrlText(url);
        setVoiceTransportState(transport);
        setChatModelOptions(models);
        setProfile(prof);
        if (nameStatusRef.current === 'idle') {
          setNameText(prof.name);
          nameSave.reset(prof.name);
        }
        if (bioStatusRef.current === 'idle') {
          setBioText(prof.bio);
          bioSave.reset(prof.bio);
        }
      } catch (err) {
        console.warn('Failed to load profile screen state:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePatch<K extends keyof UserProfile>(
    patch: ProfilePatch,
    field?: K,
  ): Promise<void> {
    const prev = profileRef.current;
    const optimisticBase: UserProfile =
      prev ?? ({ ...DEFAULT_PROFILE_VALUES, id: '', updated_at: '' } as UserProfile);
    setProfile({ ...optimisticBase, ...patch } as UserProfile);
    if (field) setFieldStatus((s) => ({ ...s, [field]: 'saving' }));
    try {
      const updated = await upsertUserProfile(patch);
      setProfile(updated);
      if (field) {
        setFieldStatus((s) => ({ ...s, [field]: 'saved' }));
        setTimeout(
          () => setFieldStatus((s) => ({ ...s, [field]: 'idle' })),
          SAVED_BADGE_HOLD_MS,
        );
      }
    } catch (err) {
      console.warn('Profile save failed:', err);
      setProfile(prev);
      if (field) setFieldStatus((s) => ({ ...s, [field]: 'error' }));
      Alert.alert('Couldn’t save', 'Your change wasn’t saved. Please try again.');
      throw err;
    }
  }

  async function saveVoiceTransport(mode: VoiceTransportMode) {
    const prev = voiceTransport;
    setVoiceTransportState(mode);
    try {
      await setVoiceTransportMode(mode);
    } catch (err) {
      console.warn('Failed to save voice transport:', err);
      setVoiceTransportState(prev);
      Alert.alert('Couldn’t save', 'Voice transport change wasn’t saved.');
    }
  }

  function clearProxyErrorTimer() {
    if (proxyErrorTimerRef.current) {
      clearTimeout(proxyErrorTimerRef.current);
      proxyErrorTimerRef.current = null;
    }
  }

  async function saveProxyUrl() {
    clearProxyErrorTimer();
    setProxyStatus('saving');
    try {
      await setProxyUrl(proxyUrlText);
      setProxyStatus('saved');
      setTimeout(() => setProxyStatus('idle'), 2000);
    } catch (err) {
      console.warn('Failed to save proxy URL:', err);
      setProxyStatus('error');
      proxyErrorTimerRef.current = setTimeout(
        () => setProxyStatus('idle'),
        PROXY_ERROR_AUTOCLEAR_MS,
      );
    }
  }

  function onProxyChange(next: string) {
    setProxyUrlText(next);
    if (proxyStatus === 'error') {
      clearProxyErrorTimer();
      setProxyStatus('idle');
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await disableTestMode();
          await getSupabase().auth.signOut();
        },
      },
    ]);
  }

  const interactive = profile !== null;

  return (
    <View className="bg-bg flex-1">
      <AppHeader title="Profile" topInset={topInset} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Profile ──────────────────────────────────────────────────── */}
        <SettingsSection title="Profile">
          <SettingsRow label="Name">
            <View className="flex-row items-center">
              <TextInput
                className="border-line text-fg flex-1 border-b py-2 text-base"
                value={nameText}
                onChangeText={setNameText}
                placeholder="Your name"
                placeholderTextColor={Colors.textFaint}
                returnKeyType="done"
                accessibilityLabel="Name"
              />
              <View className="ml-3">
                <StatusBadge status={nameSave.status} />
              </View>
            </View>
          </SettingsRow>

          <View className="mt-4">
            <SettingsRow label="About you">
              <TextInput
                className="text-fg py-2 text-base"
                value={bioText}
                onChangeText={setBioText}
                placeholder="A few lines about yourself, your goals, what matters to you..."
                placeholderTextColor={Colors.textFaint}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel="About you"
              />
              <View className="-mt-1 flex-row justify-end">
                <StatusBadge status={bioSave.status} />
              </View>
            </SettingsRow>
          </View>
        </SettingsSection>

        {/* ── Coach Style ──────────────────────────────────────────────── */}
        <SettingsSection title="Coach Style" bare>
          <CardPicker
            layout="row"
            options={PERSONALITIES}
            value={profile?.personality ?? 'stoic'}
            onChange={(v) => savePatch({ personality: v }, 'personality')}
            a11yLabel="Coach style"
            disabled={!interactive}
          />
        </SettingsSection>

        {/* ── Chat Model ───────────────────────────────────────────────── */}
        <SettingsSection title="Chat Model">
          <CardPicker
            layout="wrap"
            options={chatModelOptions.map((m) => ({
              value: m.id,
              label: m.label,
              disabled: !m.available,
            }))}
            value={(profile?.preferred_chat_model ?? 'gpt_4o') as ChatModelChoice}
            onChange={(v) =>
              savePatch({ preferred_chat_model: v }, 'preferred_chat_model')
            }
            a11yLabel="Chat model"
            disabled={!interactive}
          />
          {fieldStatus.preferred_chat_model ? (
            <View className="mt-2 flex-row justify-end">
              <StatusBadge status={fieldStatus.preferred_chat_model} />
            </View>
          ) : null}
        </SettingsSection>

        {/* ── Voice ────────────────────────────────────────────────────── */}
        <SettingsSection title="Voice">
          <SettingsRow label="TTS voice">
            <ChipPicker
              scroll={false}
              options={VOICES}
              value={profile?.tts_voice ?? 'nova'}
              onChange={(v) => savePatch({ tts_voice: v }, 'tts_voice')}
              a11yLabel="TTS voice"
              disabled={!interactive}
            />
          </SettingsRow>

          <View className="mt-4">
            <SettingsRow label="Voice transport">
              <CardPicker
                layout="stack"
                options={VOICE_TRANSPORTS}
                value={voiceTransport}
                onChange={saveVoiceTransport}
                a11yLabel="Voice transport"
              />
            </SettingsRow>
          </View>
        </SettingsSection>

        {/* ── Schedule ─────────────────────────────────────────────────── */}
        <SettingsSection title="Schedule">
          <View className="gap-5">
            <SettingsRow label="Timezone">
              <ChipPicker
                options={TIMEZONES}
                value={profile?.timezone ?? 'America/Los_Angeles'}
                onChange={(v) => savePatch({ timezone: v }, 'timezone')}
                a11yLabel="Timezone"
                disabled={!interactive}
              />
            </SettingsRow>

            <SettingsRow
              label="New day starts at"
              hint="Hours before this are still counted as the previous night."
            >
              <HourPicker
                options={DAY_START_HOURS}
                value={profile?.day_start_hour ?? 0}
                onChange={(h) =>
                  savePatch({ day_start_hour: h }, 'day_start_hour')
                }
                a11yLabel="Day start hour"
                disabled={!interactive}
              />
            </SettingsRow>

            <SettingsRow label="Morning session until">
              <HourPicker
                options={MORNING_DEADLINE_HOURS}
                value={profile?.morning_deadline_hour ?? 12}
                onChange={(h) =>
                  savePatch({ morning_deadline_hour: h }, 'morning_deadline_hour')
                }
                a11yLabel="Morning session deadline"
                disabled={!interactive}
              />
            </SettingsRow>

            <SettingsRow label="Evening session from">
              <HourPicker
                options={EVENING_START_HOURS}
                value={profile?.evening_start_hour ?? 17}
                onChange={(h) =>
                  savePatch({ evening_start_hour: h }, 'evening_start_hour')
                }
                a11yLabel="Evening session start"
                disabled={!interactive}
              />
            </SettingsRow>
          </View>
        </SettingsSection>

        {/* ── Server ───────────────────────────────────────────────────── */}
        <SettingsSection title="Server">
          <SettingsRow
            label="Proxy URL"
            hint={
              proxyStatus === 'saved'
                ? '✓ Saved'
                : proxyStatus === 'error'
                ? 'Couldn’t save — check the URL and try again.'
                : 'Enter your ngrok or local IP URL (e.g. https://xxxx.ngrok-free.app)'
            }
          >
            <TextInput
              className="border-line text-fg border-b py-2 font-mono text-sm"
              value={proxyUrlText}
              onChangeText={onProxyChange}
              onBlur={saveProxyUrl}
              onSubmitEditing={saveProxyUrl}
              placeholder={getDefaultProxyUrl()}
              placeholderTextColor={Colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              accessibilityLabel="Proxy URL"
            />
          </SettingsRow>
        </SettingsSection>

        {/* ── Sign Out ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={confirmSignOut}
          className="border-danger mb-4 mt-8 self-center rounded-full border px-8 py-3"
          accessibilityRole="button"
        >
          <Text className="text-danger text-sm font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
