// The five Pandava coaches. Sourced from the glass-board spec — each brother
// owns one life domain and runs the same loop: daily Sadhanas, recurring
// Celebrates, and the Skills + Tools that carry it. Static for now; will move
// to Supabase (`v2_coaches`) once the setup flow lands.

import { Colors } from './theme';

export type CoachId = 'nakula' | 'bheem' | 'arjun' | 'yudi' | 'sahdev';

export type Sadhana = {
  name: string;
  description: string;
  note?: string;
};

export type Celebrate = {
  name: string;
  formula?: boolean;
  uncertain?: boolean;
};

export type Coach = {
  id: CoachId;
  name: string;
  domain: string;
  accent: string;
  accentDim: string;
  // Code name is split into the inner Spirit and an outer Visual Personification.
  spirit: string;
  spiritGloss?: string;
  spiritUncertain?: boolean;
  visual: string;
  visualUncertain?: boolean;
  sadhanas: Sadhana[];
  celebrates: Celebrate[];
  skill?: string;
  skillUncertain?: boolean;
  tool?: string;
};

export const COACHES: Coach[] = [
  {
    id: 'nakula',
    name: 'Nakula',
    domain: 'aesthetics & self-presentation',
    accent: Colors.pink,
    accentDim: Colors.pinkDim,
    spirit: 'Queer Aesthete',
    visual: 'Ranveer Singh',
    sadhanas: [
      {
        name: 'Grooming',
        description:
          'A standing routine for hair, beard, nails, and fragrance — treated as a daily ritual rather than an afterthought. The aim is to consistently show up looking deliberate, which quietly reinforces the identity of someone who takes their presentation seriously.',
      },
      {
        name: 'Pictures',
        description:
          'Regularly taking and curating photos of yourself — to document, to share, and to grow comfortable in front of a camera. Over time it builds a visual record of progress and a sharper eye for angle, light, and styling.',
      },
      {
        name: 'Skin Care',
        description:
          'A simple morning and evening regimen — cleanse, treat, moisturise, SPF — to keep skin healthy and clear. Low effort per day, high compounding payoff over the years.',
      },
      {
        name: 'Guitar Practice',
        description:
          'Deliberate acoustic practice, mostly the Hindi pop you love, with the difficulty stepped up a notch each week so you’re always slightly stretched. Treating it as a craft keeps it from flattening into background strumming.',
        note: 'progressively harder each week',
      },
      {
        name: 'Sex Ed',
        description:
          'Ongoing self-education around intimacy — sexual health, communication, consent, and confidence — so this part of life is met with knowledge and intention rather than guesswork. A curiosity-and-maturity practice, not a performance metric.',
      },
    ],
    celebrates: [
      { name: 'Folsom' },
      { name: 'Rave' },
      { name: 'Sexual Adventure' },
      { name: 'Art Performance' },
    ],
    skill: 'Set Recording',
    skillUncertain: true,
  },
  {
    id: 'bheem',
    name: 'Bheem',
    domain: 'body, food & strength',
    accent: Colors.accent,
    accentDim: Colors.accentDim,
    spirit: 'Triple H',
    spiritGloss: 'healthy · hearty · hunky',
    visual: 'Dharmendra',
    sadhanas: [
      {
        name: 'Macro Target',
        description:
          'Landing your daily macronutrient targets, with protein as the anchor and calories set to your current goal. Consistency beats precision — most days in range matters far more than any single perfect day.',
      },
      {
        name: '1% better Workout',
        description:
          'Showing up to train for small, compounding gains — a little more load, one more rep, or cleaner form than last time. Progressive overload as a daily disposition rather than a hunt for one-off PRs.',
      },
      {
        name: 'Sauna / Cold exposure',
        description:
          'Deliberate heat and cold — sauna and cold plunge or shower — for recovery, resilience, and the discipline of choosing discomfort on purpose. A reliable reset for body and nervous system.',
      },
      {
        name: 'Test + Medication',
        description:
          'Staying on top of regular bloodwork and biomarker testing, plus any prescribed medication or supplementation, so the physical work is data-informed instead of guessed at.',
        note: 'reading uncertain — could also be "Test + Meditation"',
      },
    ],
    celebrates: [
      { name: 'Bf% ↓ == 0', formula: true, uncertain: true },
      { name: 'Lap%4 == 0', formula: true, uncertain: true },
    ],
  },
  {
    id: 'arjun',
    name: 'Arjun',
    domain: 'focus & deep work',
    accent: Colors.cyan,
    accentDim: 'rgba(91,200,239,0.14)',
    spirit: 'Intellectual Athlete',
    visual: 'Andrej Karpathy',
    visualUncertain: true,
    sadhanas: [
      {
        name: '20 min Read',
        description:
          'A daily, non-negotiable block of focused reading — books over feeds — to keep your input quality high. Deliberately small so it actually happens every single day.',
      },
      {
        name: '3 hr Deep Work',
        description:
          'A protected, distraction-free block for your hardest, highest-leverage thinking. The single biggest lever on output; the rest of the day is arranged around it, not the other way round.',
      },
      {
        name: 'Learn 1 thing a week',
        description:
          'Committing to truly learn one new idea, concept, or skill each week — ideally to the point you could explain it simply. A forcing function for steady growth and a guard against autopilot.',
      },
      {
        name: 'Information Diet',
        description:
          'Consciously curating what you consume — pruning low-value feeds and notifications, choosing signal over noise. Attention is treated like nutrition: what goes in shapes what comes out.',
      },
    ],
    celebrates: [
      { name: 'Lecture / Conference' },
      { name: 'Meeting Mastery' },
      { name: 'LinkedIn Post' },
      { name: 'Exceed Expectation' },
    ],
    tool: 'Knowledge Base',
  },
  {
    id: 'yudi',
    name: 'Yudi',
    domain: 'values, ethics & emotion',
    accent: Colors.green,
    accentDim: Colors.greenDim,
    spirit: 'Self Control',
    spiritUncertain: true,
    visual: 'Rama',
    sadhanas: [
      {
        name: 'Call family / friend',
        description:
          'Proactively reaching out to the people who matter — an actual call, not just reactive replies. Tending the relationships that keep you grounded.',
      },
      {
        name: 'Finance Review',
        description:
          'A recurring look at spending, saving, and goals so money stays aligned with your values and nothing quietly drifts. Awareness is the foundation every good financial decision sits on.',
      },
      {
        name: 'Substance Control',
        description:
          'Keeping a mindful, deliberate relationship with alcohol and other substances — deciding ahead of time rather than in the moment. The aim is agency and clarity, not rules for their own sake.',
      },
      {
        name: 'Emotion Journaling',
        description:
          'Writing through what you feel to name it, trace its source, and respond rather than react. Pairs naturally with your daily voice-reflection as a regulation tool.',
      },
      {
        name: 'Costly Honesty',
        description:
          'Choosing truth even when it costs you something — the uncomfortable, integrity-defining kind. Of all the practices, this is the one that most directly channels Yudhishthira’s dharma.',
      },
    ],
    celebrates: [{ name: 'Group Call / Party' }],
  },
  {
    id: 'sahdev',
    name: 'Sahdev',
    domain: 'building Saarthi',
    accent: Colors.purple,
    accentDim: Colors.purpleDim,
    spirit: 'Visionary Builder',
    visual: 'Tony Stark',
    visualUncertain: true,
    sadhanas: [
      {
        name: 'GTD',
        description:
          'Running a Getting Things Done system — capture everything, clarify the next action, organise, and review — so nothing important survives only in your head. The operating layer underneath the building.',
      },
      {
        name: 'Daily / Weekly Review',
        description:
          'A short daily close-out and a wider weekly zoom-out to reflect, reprioritise, and reset. The feedback loop that keeps the rest of the system honest.',
      },
      {
        name: 'Personal Brain',
        description:
          'Maintaining a personal knowledge base — a ‘second brain’ of linked notes, ideas, and references — so insight compounds instead of evaporating.',
      },
      {
        name: 'Manifestation',
        description:
          'Regularly articulating the vision you’re building toward and keeping it vivid and written down. Less mysticism, more clarity-of-intent that quietly steers daily action.',
      },
    ],
    celebrates: [
      { name: 'Open Source' },
      { name: 'Userₙ = 2 × Userₙ₋₁', formula: true },
      { name: 'num-reviewₙ = num-reviewₙ₋₁ × 2', formula: true, uncertain: true },
    ],
  },
];

export const COACHES_BY_ID: Record<CoachId, Coach> = Object.fromEntries(
  COACHES.map((c) => [c.id, c]),
) as Record<CoachId, Coach>;
