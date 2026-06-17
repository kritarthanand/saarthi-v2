// expo-audio SDK 56 API confirmed via node_modules/expo-audio/build/ExpoAudio.d.ts:
// hook-based useAudioRecorder + requestRecordingPermissionsAsync + RecordingPresets.
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';

import { Colors } from '@/constants/theme';
import { useTranscribe } from '@/lib/threads.hooks';
import type { ChatMessage } from '@/lib/mockData';

import { CheckIcon, MicIcon } from '../icons';

type ThreadRef = { id: string; tag: string; locked?: boolean };

const fmt = (s: number) => {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export type VoiceSavePayload = {
  tag: string;
  messages: ChatMessage[];
  elapsed: number;
};

export type VoiceSessionHandle = {
  /** Stop + transcribe (if recording) then dismiss. Safe from a backdrop tap. */
  dismiss: () => void;
};

type Phase = 'requesting' | 'denied' | 'recording' | 'transcribing' | 'done' | 'error';

export const VoiceSession = forwardRef<
  VoiceSessionHandle,
  {
    accent?: string;
    maxSeconds?: number;
    warnSeconds?: number;
    existingThreads: ThreadRef[];
    onClose: () => void;
    onSave?: (payload: VoiceSavePayload) => void;
    /**
     * Called with the transcribed text when recording stops + Whisper returns.
     * The caller pipes it into the active thread's Composer.
     */
    onTranscribed?: (text: string) => void;
    topInset?: number;
  }
>(function VoiceSession(
  {
    accent = Colors.accent,
    maxSeconds = 120,
    warnSeconds = 30,
    onClose,
    onTranscribed,
    topInset = 50,
  },
  ref
) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const transcribe = useTranscribe();

  const [phase, setPhase] = useState<Phase>('requesting');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const elapsedRef = useRef(0);
  // Guard against double-fires (e.g. backdrop + Done both calling finalize).
  const finalizingRef = useRef(false);

  // Request mic permission + start recording on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (cancelled) return;
        if (!perm.granted) {
          setPhase('denied');
          return;
        }
        await recorder.prepareToRecordAsync();
        if (cancelled) return;
        recorder.record();
        setPhase('recording');
      } catch (e) {
        if (cancelled) return;
        console.error('mic init failed', e);
        setError(String(e));
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // recorder identity is stable per render of this component; intentionally [].
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Elapsed timer; ticks 1 Hz when recording.
  useEffect(() => {
    if (phase !== 'recording') return;
    const tick = setInterval(() => {
      const next = Math.min(elapsedRef.current + 1, maxSeconds);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= maxSeconds) {
        // Auto-finalize when the cap hits.
        void finalize();
      }
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, maxSeconds]);

  const finalize = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;

    if (phase === 'denied' || phase === 'error') {
      onClose();
      return;
    }

    try {
      if (phase === 'recording') {
        setPhase('transcribing');
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) {
          throw new Error('No recording URI');
        }
        const text = await transcribe({ uri, type: 'audio/m4a', name: 'recording.m4a' });
        if (text) onTranscribed?.(text);
      }
      setPhase('done');
      onClose();
    } catch (e) {
      console.error('finalize failed', e);
      setError(String(e));
      setPhase('error');
      onClose();
    }
  }, [phase, recorder, transcribe, onTranscribed, onClose]);

  // Stable handle so parents re-binding `onClose` don't churn the ref.
  const finalizeRef = useRef(finalize);
  useEffect(() => {
    finalizeRef.current = finalize;
  }, [finalize]);
  useImperativeHandle(ref, () => ({ dismiss: () => finalizeRef.current() }), []);

  const remaining = maxSeconds - elapsed;
  const isWarn = remaining <= warnSeconds && remaining > 0 && phase === 'recording';
  const isOver = remaining <= 0 && phase === 'recording';
  const ringColor = isOver ? Colors.danger : isWarn ? Colors.warn : accent;

  const statusLabel = (() => {
    switch (phase) {
      case 'requesting':
        return 'requesting mic…';
      case 'denied':
        return 'microphone access denied';
      case 'recording':
        return isOver ? 'time up' : isWarn ? `wrap up · ${fmt(remaining)} left` : 'listening';
      case 'transcribing':
        return 'transcribing…';
      case 'done':
        return 'done';
      case 'error':
        return error ? `error: ${error.slice(0, 80)}` : 'error';
    }
  })();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: topInset, paddingLeft: 12, paddingRight: 16, paddingBottom: 10,
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderBottomColor: Colors.border, borderBottomWidth: 1,
        }}
      >
        <Pressable
          onPress={() => finalizeRef.current()}
          accessibilityRole="button"
          accessibilityLabel="Close voice"
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.06)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300' }}>×</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: Colors.textDim, fontWeight: '600' }}>
            Voice dictation
          </Text>
          <Text style={{ fontSize: 11.5, color: Colors.textFaint, fontWeight: '500' }}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <View
          style={{
            width: 120, height: 120, borderRadius: 60,
            backgroundColor: ringColor + '22',
            borderWidth: 2, borderColor: ringColor,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {phase === 'transcribing' ? (
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>…</Text>
          ) : (
            <MicIcon size={48} color="#fff" />
          )}
        </View>
        <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
          {phase === 'requesting' && 'Requesting microphone…'}
          {phase === 'recording' && 'Speak — I’ll transcribe when you’re done.'}
          {phase === 'transcribing' && 'Transcribing your clip…'}
          {phase === 'denied' && 'Microphone permission is required for voice dictation.'}
          {phase === 'error' && 'Something went wrong.'}
        </Text>
        {phase === 'recording' && (
          <Text style={{ color: Colors.textFaint, fontSize: 12 }}>
            {fmt(elapsed)} · {fmt(maxSeconds)} cap
          </Text>
        )}
      </View>

      {/* Bottom */}
      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          paddingTop: 14, paddingHorizontal: 16, paddingBottom: 28,
          alignItems: 'center',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            phase === 'recording' ? 'Stop and transcribe' : 'Close'
          }
          onPress={() => finalizeRef.current()}
          disabled={phase === 'transcribing'}
          style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: phase === 'recording' ? ringColor : Colors.bgCardElev,
            alignItems: 'center', justifyContent: 'center',
            opacity: phase === 'transcribing' ? 0.5 : 1,
          }}
        >
          {phase === 'recording' ? (
            <View style={{ width: 18, height: 18, backgroundColor: '#fff', borderRadius: 4 }} />
          ) : (
            <CheckIcon size={28} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
});
