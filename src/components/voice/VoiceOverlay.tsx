// Renders whichever step of the voice flow is current. Container-agnostic: the
// phone layout wraps this in a Modal, the iPad/web layout in a floating card.

import type { RefObject } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { COACHES_BY_ID } from '@/constants/pandavas';
import { Colors } from '@/constants/theme';
import type { useVoiceFlow } from '@/hooks/useVoiceFlow';

import { CoachPicker } from './CoachPicker';
import { SessionChoice } from './SessionChoice';
import { VoiceSession, type VoiceSessionHandle } from './VoiceSession';

export type VoiceFlow = ReturnType<typeof useVoiceFlow>;

export function VoiceOverlay({
  flow,
  accent,
  topInset = 50,
  sessionRef,
  embedded = false,
}: {
  flow: VoiceFlow;
  accent: string;
  topInset?: number;
  sessionRef: RefObject<VoiceSessionHandle | null>;
  /** Rendered in the iPad/web card rather than the full-screen phone modal. */
  embedded?: boolean;
}) {
  const { state } = flow;

  if (state.kind === 'idle') return null;

  if (state.kind === 'picking') {
    return (
      <CoachPicker
        onSelect={flow.pickCoach}
        onCancel={flow.cancel}
        topInset={topInset}
        embedded={embedded}
      />
    );
  }

  if (state.kind === 'preparing') {
    const coach = COACHES_BY_ID[state.coachId];
    return <Waiting label={`Opening your thread with ${coach.name}…`} color={coach.accent} />;
  }

  if (state.kind === 'saving') {
    const coach = COACHES_BY_ID[state.ctx.coachId];
    return <Waiting label="Saving that clip…" color={coach.accent} />;
  }

  if (state.kind === 'dictating') {
    return (
      <VoiceSession
        key="dictation"
        ref={sessionRef}
        accent={accent}
        maxSeconds={120}
        warnSeconds={30}
        onFinish={flow.handleClip}
        topInset={topInset}
      />
    );
  }

  if (state.kind === 'recording') {
    const { ctx } = state;
    const coach = COACHES_BY_ID[ctx.coachId];
    return (
      <VoiceSession
        // Remount per clip so the recorder restarts cleanly on "keep talking".
        key={`${ctx.sessionId}-${ctx.segment}`}
        ref={sessionRef}
        accent={coach.accent}
        maxSeconds={120}
        warnSeconds={30}
        title={`Talking to ${coach.name}`}
        caption={ctx.segment > 0 ? `clip ${ctx.segment + 1}` : undefined}
        onFinish={flow.handleClip}
        topInset={topInset}
      />
    );
  }

  const { ctx, lastTranscript } = state;
  return (
    <SessionChoice
      coach={COACHES_BY_ID[ctx.coachId]}
      segmentCount={ctx.segment}
      totalSeconds={ctx.totalSeconds}
      lastTranscript={lastTranscript}
      busy={flow.busy}
      error={flow.error}
      onContinue={flow.continueTalking}
      onRespond={flow.respond}
      onDump={flow.dump}
      topInset={topInset}
      canExport={ctx.canExport}
    />
  );
}

function Waiting({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        flex: 1, backgroundColor: Colors.bg,
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
      }}
    >
      <ActivityIndicator size="large" color={color} />
      <Text style={{ color: Colors.textDim, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
