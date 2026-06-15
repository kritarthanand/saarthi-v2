// Saarthi V2 dark theme tokens — mirrors the design's SAARTHI_THEME.
// Keep this in sync with tailwind.config.js.

export const Colors = {
  bg: '#0A0A0B',
  bgElev: '#141416',
  bgCard: '#1A1A1D',
  bgCardElev: '#222226',

  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)',

  text: '#F5F5F7',
  textDim: 'rgba(245,245,247,0.58)',
  textFaint: 'rgba(245,245,247,0.36)',

  accent: '#F08A3E',
  accentDim: 'rgba(240,138,62,0.14)',

  green: '#3FBF7F',
  greenDim: 'rgba(63,191,127,0.14)',
  blue: '#5B8DEF',
  blueDim: 'rgba(91,141,239,0.14)',
  purple: '#8B7BD9',
  purpleDim: 'rgba(139,123,217,0.14)',
  pink: '#E07AA8',
  pinkDim: 'rgba(224,122,168,0.14)',
  cyan: '#5BC8EF',
  cyanDim: 'rgba(91,200,239,0.14)',
  gold: '#D9B86E',

  warn: '#FF7A2E',
  danger: '#FF4D4D',
} as const;

export type ThreadTheme = { color: string; dim: string; glyph: string };

export const THREAD_THEMES: Record<string, ThreadTheme> = {
  '#MorningRitual':   { color: '#F08A3E', dim: 'rgba(240,138,62,0.14)',  glyph: '☀' },
  '#FitnessForToday': { color: '#3FBF7F', dim: 'rgba(63,191,127,0.14)',  glyph: '◐' },
  '#WorkoutPlan':     { color: '#3FBF7F', dim: 'rgba(63,191,127,0.14)',  glyph: '◐' },
  '#FoodForToday':    { color: '#D9B86E', dim: 'rgba(217,184,110,0.14)', glyph: '◐' },
  '#FocusAndToDo':    { color: '#5B8DEF', dim: 'rgba(91,141,239,0.14)',  glyph: '◆' },
  '#EveningReview':   { color: '#8B7BD9', dim: 'rgba(139,123,217,0.14)', glyph: '☾' },
  '#EveningWindDown': { color: '#8B7BD9', dim: 'rgba(139,123,217,0.14)', glyph: '☾' },
  '#Vent':            { color: '#E07AA8', dim: 'rgba(224,122,168,0.14)', glyph: '✦' },
  '#DeepWork':        { color: '#5B8DEF', dim: 'rgba(91,141,239,0.14)',  glyph: '◆' },
  '#Reading':         { color: '#D9B86E', dim: 'rgba(217,184,110,0.14)', glyph: '✦' },
  '#WeeklyReview':    { color: '#8B7BD9', dim: 'rgba(139,123,217,0.14)', glyph: '✦' },
  '#EveningRitual':   { color: '#8B7BD9', dim: 'rgba(139,123,217,0.14)', glyph: '☾' },
  '#WeeklyRitual':    { color: '#8B7BD9', dim: 'rgba(139,123,217,0.14)', glyph: '✦' },
  '#Gratitude':       { color: '#F08A3E', dim: 'rgba(240,138,62,0.14)',  glyph: '✦' },
  '#Hydration':       { color: '#5BC8EF', dim: 'rgba(91,200,239,0.14)',  glyph: '◯' },
  '#Note':            { color: '#E07AA8', dim: 'rgba(224,122,168,0.14)', glyph: '✦' },
  '#MealLog':         { color: '#D9B86E', dim: 'rgba(217,184,110,0.14)', glyph: '◯' },
  '#WorkoutLog':      { color: '#3FBF7F', dim: 'rgba(63,191,127,0.14)',  glyph: '◐' },
  '#FocusTime':       { color: '#5B8DEF', dim: 'rgba(91,141,239,0.14)',  glyph: '◆' },
  '#CleanRitual':     { color: '#5BC8EF', dim: 'rgba(91,200,239,0.14)',  glyph: '◯' },
  '#CatchUp':         { color: '#E07AA8', dim: 'rgba(224,122,168,0.14)', glyph: '✦' },
};

export const threadTheme = (tag: string): ThreadTheme =>
  THREAD_THEMES[tag] ?? { color: Colors.accent, dim: Colors.accentDim, glyph: '✦' };

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
} as const;
