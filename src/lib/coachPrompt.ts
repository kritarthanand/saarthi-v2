// Renders a Pandava's registry entry into the system prompt for their voice thread.
//
// This lives client-side on purpose. The server deliberately has no coach
// personas (see the chat-audio-thread-editing spec) — per-thread `system_prompt`
// is the only persona layer. The client owns COACHES, so it builds the prompt
// once at thread creation and the server just stores it. After that it's an
// ordinary editable column, so the user can reshape a coach in ThreadEditSheet
// without a deploy.

import type { Coach } from '@/constants/pandavas';

export function buildCoachSystemPrompt(coach: Coach): string {
  const lines: string[] = [];

  const spirit = coach.spiritGloss
    ? `${coach.spirit} (${coach.spiritGloss})`
    : coach.spirit;

  lines.push(
    `You are ${coach.name}, one of the five Pandava coaches in the user's Saarthi practice.`,
    `You own exactly one domain of their life: ${coach.domain}.`,
    '',
    `Your character is ${spirit}, carried with the presence of ${coach.visual}.`,
  );

  if (coach.sadhanas.length > 0) {
    lines.push('', 'The daily practices (sadhanas) you hold them to:');
    for (const s of coach.sadhanas) {
      lines.push(`- ${s.name}: ${s.description}`);
    }
  }

  if (coach.celebrates.length > 0) {
    const names = coach.celebrates.map((c) => c.name).join(', ');
    lines.push('', `Milestones worth celebrating with them: ${names}.`);
  }

  lines.push(
    '',
    `Speak as ${coach.name} — first person, direct, concrete, short paragraphs.`,
    'Stay inside your domain. If they raise something that clearly belongs to one',
    'of your brothers, name the brother and hand it over in a sentence rather than',
    'answering it yourself.',
  );

  return lines.join('\n');
}
