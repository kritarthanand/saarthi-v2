// Owns the voice flow: short-press dictation, and the long-press coach session
// (pick a Pandava → talk in ≤2 min clips → keep going / get a reply / dump it).
//
// Lives in a hook rather than in AppRoot because the flow is a small state
// machine with a persistence invariant worth stating in one place: a clip is
// written to the thread the moment it transcribes, before the user is asked what
// to do next. Nothing on the choice screen can lose a recording.

import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { COACHES_BY_ID, type CoachId } from '@/constants/pandavas';
import { buildCoachSystemPrompt } from '@/lib/coachPrompt';
import {
  useExportThread,
  useRequestReply,
  useSendMessage,
  useStartVoiceSession,
} from '@/lib/threads.hooks';
import type { VoiceResult } from '@/components/voice/VoiceSession';
import type { ChoiceBusy } from '@/components/voice/SessionChoice';

export type SessionCtx = {
  coachId: CoachId;
  threadId: string;
  /** Groups the clips of one sitting; the exporter renders per session_id. */
  sessionId: string;
  /** Clips saved so far. */
  segment: number;
  totalSeconds: number;
};

export type VoiceFlowState =
  | { kind: 'idle' }
  | { kind: 'dictating' }
  | { kind: 'picking' }
  | { kind: 'preparing'; coachId: CoachId }
  | { kind: 'recording'; ctx: SessionCtx }
  | { kind: 'saving'; ctx: SessionCtx }
  | { kind: 'choosing'; ctx: SessionCtx; lastTranscript: string };

function uuidv4(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useVoiceFlow({
  onDictated,
  onOpenThread,
  onThreadsChanged,
}: {
  /** Short-press result — piped into the open thread's Composer. */
  onDictated: (text: string) => void;
  /** Called after "respond" so the user lands on the reply. */
  onOpenThread: (threadId: string) => void;
  onThreadsChanged: () => void;
}) {
  const [state, setState] = useState<VoiceFlowState>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ChoiceBusy>(null);

  const startVoiceSession = useStartVoiceSession();
  const sendMessage = useSendMessage();
  const requestReply = useRequestReply();
  const exportThread = useExportThread();

  // Guards the async gap in pickCoach so a double-tap can't create two sittings.
  const startingRef = useRef(false);

  const reset = useCallback(() => {
    setState({ kind: 'idle' });
    setError(null);
    setBusy(null);
  }, []);

  const openDictation = useCallback(() => {
    setError(null);
    setState({ kind: 'dictating' });
  }, []);

  const openPicker = useCallback(() => {
    setError(null);
    setState({ kind: 'picking' });
  }, []);

  const pickCoach = useCallback(
    async (coachId: CoachId) => {
      if (startingRef.current) return;
      startingRef.current = true;
      setState({ kind: 'preparing', coachId });
      try {
        const coach = COACHES_BY_ID[coachId];
        const thread = await startVoiceSession(coachId, {
          // The thread is the coach: title and tag both read as the Pandava's
          // name rather than a generic "Voice".
          title: coach.name,
          tag: `#${coach.name}`,
          systemPrompt: buildCoachSystemPrompt(coach),
        });
        onThreadsChanged();
        setState({
          kind: 'recording',
          ctx: {
            coachId,
            threadId: thread.id,
            sessionId: uuidv4(),
            segment: 0,
            totalSeconds: 0,
          },
        });
      } catch (e) {
        console.error('start voice session failed', e);
        reset();
        Alert.alert(
          'Could not start',
          e instanceof Error ? e.message : 'The server did not respond.',
        );
      } finally {
        startingRef.current = false;
      }
    },
    [startVoiceSession, onThreadsChanged, reset],
  );

  /**
   * Called by VoiceSession when a clip ends. `null` means nothing usable came
   * back (cancelled, denied, silence, or a failed transcription).
   */
  const handleClip = useCallback(
    async (result: VoiceResult | null) => {
      if (state.kind === 'dictating') {
        if (result) onDictated(result.text);
        reset();
        return;
      }
      if (state.kind !== 'recording') return;

      const { ctx } = state;

      if (!result) {
        // Nothing recorded. If this was the first clip there's no sitting to
        // return to, so bail out entirely rather than showing an empty choice.
        if (ctx.segment === 0) {
          reset();
          return;
        }
        setError('That clip did not come through — nothing was saved for it.');
        setState({ kind: 'choosing', ctx, lastTranscript: '' });
        return;
      }

      const next: SessionCtx = {
        ...ctx,
        segment: ctx.segment + 1,
        totalSeconds: ctx.totalSeconds + result.durationS,
      };

      setState({ kind: 'saving', ctx: next });
      try {
        await sendMessage(ctx.threadId, result.text, undefined, {
          // No reply per clip — the whole sitting gets one, on request.
          reply: false,
          meta: {
            voice: true,
            session_id: ctx.sessionId,
            segment: next.segment,
            duration_s: result.durationS,
          },
        });
        setError(null);
        onThreadsChanged();
        setState({ kind: 'choosing', ctx: next, lastTranscript: result.text });
      } catch (e) {
        console.error('saving voice clip failed', e);
        setError(
          `Could not save that clip: ${e instanceof Error ? e.message : 'unknown error'}`,
        );
        // Keep the transcript on screen — it is the only remaining copy.
        setState({ kind: 'choosing', ctx, lastTranscript: result.text });
      }
    },
    [state, onDictated, onThreadsChanged, sendMessage, reset],
  );

  const continueTalking = useCallback(() => {
    if (state.kind !== 'choosing') return;
    setError(null);
    setState({ kind: 'recording', ctx: state.ctx });
  }, [state]);

  const respond = useCallback(async () => {
    if (state.kind !== 'choosing') return;
    const { threadId } = state.ctx;
    setBusy('reply');
    setError(null);
    try {
      await requestReply(threadId);
      onThreadsChanged();
      reset();
      // Land the user on the thread so they actually see the reply.
      onOpenThread(threadId);
    } catch (e) {
      console.error('request reply failed', e);
      setError(
        `Could not get a reply: ${e instanceof Error ? e.message : 'unknown error'}. Your clips are saved.`,
      );
      setBusy(null);
    }
  }, [state, requestReply, onThreadsChanged, onOpenThread, reset]);

  const dump = useCallback(async () => {
    if (state.kind !== 'choosing') return;
    const { threadId } = state.ctx;
    setBusy('export');
    setError(null);
    try {
      const res = await exportThread(threadId);
      if (res.status === 'error') {
        throw new Error(res.error || 'export failed');
      }
      onThreadsChanged();
      reset();
    } catch (e) {
      console.error('export failed', e);
      // The clips are in the DB either way; only the note write failed.
      setError(
        `Saved, but writing your daily note failed: ${e instanceof Error ? e.message : 'unknown error'}`,
      );
      setBusy(null);
    }
  }, [state, exportThread, onThreadsChanged, reset]);

  /**
   * Backdrop tap / hardware back. Backing out of the choice screen is treated
   * as "just leave it" rather than a silent abandon: the clips are already in
   * the DB either way, but skipping the export would leave them out of the
   * daily note with nothing telling the user why.
   */
  const dismiss = useCallback(() => {
    if (state.kind === 'choosing') {
      void dump();
      return;
    }
    reset();
  }, [state.kind, dump, reset]);

  return {
    state,
    error,
    busy,
    openDictation,
    openPicker,
    pickCoach,
    handleClip,
    continueTalking,
    respond,
    dump,
    dismiss,
    cancel: reset,
  };
}
