// Saarthi V2 — mock data ported from the design prototype.
// Stays in JS-land for now; will get swapped for Supabase in a later pass.

export type ThreadKind =
  | 'checklist'
  | 'focus'
  | 'focus-title'
  | 'workout'
  | 'food'
  | 'evening'
  | 'note'
  | 'fitness';

export type ThreadItem = {
  id: string;
  label: string;
  done: boolean;
  points?: number;
  hasChat?: boolean;
  scheduled?: string;
  priority?: 'high' | 'med' | 'low';
};

export type ChatMessage = {
  from: 'ai' | 'me';
  text: string;
  time?: string;
  meta?: string;
};

export type Thread = {
  id: string;
  tag: string;
  kind: ThreadKind;
  subtitle: string;
  timeAgo: string;
  items: ThreadItem[];
  pointsEarned: number;
  pointsTotal: number;
  preview?: string[];
  mantra?: string;
  headline?: string | { emoji: string; label: string }[];
  chips?: { label: string; done?: boolean }[];
  stats?: { label: string; value: string; pct: number; color: string }[];
  locked?: boolean;
  messages?: ChatMessage[];
  /** User-typed (or voice-replayed) chat messages appended after the seeded transcript. */
  appendedMessages?: ChatMessage[];
  elapsed?: number;
};

export type ScoreDay = { day: string; score: number; label: string; isToday?: boolean };
export const SCORE_WEEK: ScoreDay[] = [
  { day: 'T', score: 78, label: 'Thu' },
  { day: 'F', score: 22, label: 'Fri' },
  { day: 'S', score: 14, label: 'Sat' },
  { day: 'S', score: 18, label: 'Sun' },
  { day: 'M', score: 24, label: 'Mon' },
  { day: 'T', score: 64, label: 'Tue' },
  { day: 'W', score: 28, label: 'Wed', isToday: true },
];
export const SCORE_TOTAL_WEEK = 248;
export const SCORE_TODAY = 28;
export const SCORE_MAX = 100;

export const TODAY_THREADS: Thread[] = [
  {
    id: 'morning',
    tag: '#MorningRitual',
    subtitle: '6 of 8 done · feels good',
    kind: 'checklist',
    timeAgo: 'started 7:12 AM',
    mantra: 'Seize the day.',
    items: [
      { id: 'm1', label: 'Make bed', done: true, points: 2 },
      { id: 'm2', label: 'Drink full glass of water', done: true, points: 2 },
      { id: 'm3', label: '10 min stretching', done: true, points: 5 },
      { id: 'm4', label: 'Cold shower', done: true, points: 8 },
      { id: 'm5', label: 'Morning journal — 1 page', done: true, points: 10, hasChat: true },
      { id: 'm6', label: 'Read 5 pages', done: true, points: 5 },
      { id: 'm7', label: 'Plan top 3 priorities', done: false, points: 6 },
      { id: 'm8', label: 'No phone for first hour', done: false, points: 8 },
    ],
    preview: ['Make bed', 'Drink water', '10 min stretch', 'Cold shower'],
    pointsEarned: 32,
    pointsTotal: 46,
  },
  {
    id: 'focus',
    tag: '#FocusAndToDo',
    subtitle: '5 todos · 2 scheduled',
    kind: 'focus',
    timeAgo: 'set up 8:04 AM',
    headline: '4 to ship · Ray Job Autoresearch',
    chips: [
      { label: '9:00 — 10:30', done: true },
      { label: '1:00 — 1:30', done: true },
    ],
    items: [
      { id: 't1', label: 'Ship onboarding v2 spec', done: false, scheduled: '10:00–12:00', priority: 'high' },
      { id: 't2', label: "Review Anika's PR", done: false, scheduled: '13:30', priority: 'med' },
      { id: 't3', label: 'Reply to Maya about offsite', done: true, priority: 'low' },
      { id: 't4', label: 'Outline Q3 roadmap doc', done: false, scheduled: '17:00–18:00', priority: 'high' },
      { id: 't5', label: 'Book dentist', done: false, priority: 'low' },
    ],
    preview: ['Ship onboarding v2', 'Review PR', 'Q3 roadmap'],
    pointsEarned: 1,
    pointsTotal: 5,
  },
  {
    id: 'focus-pm',
    tag: '#FocusAndToDo',
    subtitle: 'evening block',
    kind: 'focus-title',
    timeAgo: 'scheduled 8:00 PM',
    headline: 'SeqHub API',
    items: [
      { id: 'tpm1', label: 'Sketch endpoint surface', done: false, priority: 'high' },
      { id: 'tpm2', label: 'Auth + rate limit notes', done: false, priority: 'med' },
    ],
    pointsEarned: 0,
    pointsTotal: 5,
  },
  {
    id: 'workout',
    tag: '#WorkoutPlan',
    subtitle: 'pull · 6 lifts · 45 min',
    kind: 'workout',
    timeAgo: 'scheduled 9:20 AM',
    headline: [
      { emoji: '🏊', label: 'Swim' },
      { emoji: '🦵', label: 'Leg day' },
    ],
    items: [
      { id: 'w1', label: 'Weighted pull-ups · 7×4', done: true, scheduled: 'set 1', priority: 'high' },
      { id: 'w2', label: 'Barbell rows · 4×8', done: true, scheduled: 'set 2', priority: 'high' },
      { id: 'w3', label: 'Lat pulldown · 3×10', done: false, scheduled: 'set 3', priority: 'med' },
      { id: 'w4', label: 'Face pulls · 3×12', done: false, scheduled: 'set 4', priority: 'med' },
      { id: 'w5', label: 'Bicep curls · 3×10', done: false, scheduled: 'set 5', priority: 'low' },
      { id: 'w6', label: 'Cooldown stretch · 5 min', done: false, scheduled: 'finish', priority: 'low' },
    ],
    preview: ['Pull-ups', 'Rows', 'Lat pulldown'],
    pointsEarned: 8,
    pointsTotal: 24,
  },
  {
    id: 'food',
    tag: '#FoodForToday',
    subtitle: '3 meals · 140g protein target',
    kind: 'food',
    timeAgo: 'planned 7:30 AM',
    stats: [
      { label: 'Protein', value: '92g / 180g', pct: 0.51, color: '#F08A3E' },
      { label: 'Calories', value: '1,060 / 2,400', pct: 0.44, color: '#E07AA8' },
    ],
    items: [
      { id: 'fo1', label: 'Breakfast · oats + eggs · 35g protein', done: true, scheduled: '8:00', priority: 'high' },
      { id: 'fo2', label: 'Lunch · chicken bowl · 50g protein', done: false, scheduled: '13:00', priority: 'high' },
      { id: 'fo3', label: 'Snack · greek yogurt + berries', done: false, scheduled: '16:00', priority: 'med' },
      { id: 'fo4', label: 'Dinner · salmon + greens · 40g protein', done: false, scheduled: '19:30', priority: 'high' },
      { id: 'fo5', label: 'Hit 3L water', done: false, priority: 'low' },
    ],
    preview: ['oats + eggs', 'chicken bowl', 'salmon'],
    pointsEarned: 4,
    pointsTotal: 18,
  },
  {
    id: 'evening',
    tag: '#EveningReview',
    subtitle: 'wind-down + reflect',
    kind: 'evening',
    timeAgo: 'unlocks 8:00 PM',
    locked: true,
    items: [
      { id: 'e1', label: 'Wins from today (1–3)', done: false, priority: 'high' },
      { id: 'e2', label: 'Where I got pulled off course', done: false, priority: 'med' },
      { id: 'e3', label: 'One thing for tomorrow morning', done: false, priority: 'high' },
      { id: 'e4', label: 'Phone in another room', done: false, scheduled: '21:30', priority: 'low' },
    ],
    preview: ['wins', 'distractions', 'tomorrow'],
    pointsEarned: 0,
    pointsTotal: 16,
  },
];

export const THREAD_CHATS: Record<string, ChatMessage[]> = {
  morning: [
    { from: 'ai', text: 'Good morning ✦ Wednesday already — let\'s set you up. Same ritual today?', time: '7:12 AM' },
    { from: 'me', text: 'Yes but skip the cold shower, traveling later', time: '7:13 AM' },
    { from: 'ai', text: 'Got it — pulling cold shower. Eight items today, 38 points up for grabs.', time: '7:13 AM' },
    { from: 'ai', text: 'Want me to add a quick 5-min meditation in place of the shower?', time: '7:13 AM', meta: 'morning: ritual_setup' },
    { from: 'me', text: 'sure', time: '7:14 AM' },
    { from: 'ai', text: 'Done. Starting your timer for stretching when you say go.', time: '7:14 AM' },
    { from: 'me', text: 'go', time: '7:18 AM' },
    { from: 'ai', text: 'Beautiful. Six down. The journal one — anything specific on your mind?', time: '8:02 AM' },
    { from: 'me', text: 'feeling a little anxious about the demo', time: '8:03 AM' },
    { from: 'ai', text: 'That tracks — high stakes meeting. Want to journal on it for 5 minutes? I\'ll prompt you.', time: '8:03 AM', meta: 'morning: journal_branch' },
  ],
  focus: [
    { from: 'ai', text: 'You said yesterday Q3 roadmap was your big one this week. Lock in 5–6pm for it?', time: '8:04 AM' },
    { from: 'me', text: "yes, and add Anika's PR review at 1:30", time: '8:05 AM' },
    { from: 'ai', text: 'Locked. Onboarding v2 spec stays as your morning deep work. 10–12.', time: '8:05 AM' },
  ],
};

export type HistoryDayThread = {
  tag: string;
  preview: string;
  time: string;
  /** Set when this history row points at a live Today thread; otherwise the row is non-routable. */
  threadId?: string;
};

export type HistoryDay = {
  label: string;
  date: string;
  threads: HistoryDayThread[];
};

export const HISTORY_DAYS: HistoryDay[] = [
  {
    label: 'Today', date: 'Wed, Apr 29',
    threads: [
      { tag: '#MorningRitual', preview: '6 of 8 done · journaled about demo', time: '7:12 AM', threadId: 'morning' },
      { tag: '#FitnessForToday', preview: 'Pull day · 7×4 weighted pull-ups', time: '9:02 AM' },
      { tag: '#FocusAndToDo', preview: '5 todos · roadmap blocked 5–6 PM', time: '8:04 AM', threadId: 'focus' },
    ],
  },
  {
    label: 'Yesterday', date: 'Tue, Apr 28',
    threads: [
      { tag: '#MorningRitual', preview: 'All 8 done · 46 pts', time: '6:58 AM' },
      { tag: '#DeepWork', preview: '2 sessions · onboarding spec', time: '10:14 AM' },
      { tag: '#Vent', preview: 'frustrated about review feedback', time: '4:30 PM' },
      { tag: '#EveningWindDown', preview: 'in bed by 10:42', time: '10:00 PM' },
    ],
  },
  {
    label: 'Mon, Apr 27', date: '',
    threads: [
      { tag: '#MorningRitual', preview: '5 of 8 — slept in', time: '7:51 AM' },
      { tag: '#FitnessForToday', preview: 'Rest day · 8.2k steps', time: '8:30 AM' },
      { tag: '#FocusAndToDo', preview: '4 of 6 done', time: '9:00 AM' },
      { tag: '#Reading', preview: '32 pages · Annie Dillard', time: '9:14 PM' },
    ],
  },
  {
    label: 'Sun, Apr 26', date: '',
    threads: [
      { tag: '#WeeklyReview', preview: 'big themes: rest, focus, less reactive', time: '11:00 AM' },
      { tag: '#Gratitude', preview: '3 things — coffee, K, the long walk', time: '11:14 AM' },
      { tag: '#FitnessForToday', preview: 'Long run · 9.4 km · 48:12', time: '7:30 AM' },
    ],
  },
  {
    label: 'Sat, Apr 25', date: '',
    threads: [
      { tag: '#MorningRitual', preview: 'Slow Saturday set — 4 items', time: '8:30 AM' },
      { tag: '#Reading', preview: '51 pages', time: '10:20 AM' },
      { tag: '#EveningWindDown', preview: 'wine + jazz, 11:20pm', time: '11:20 PM' },
    ],
  },
  {
    label: 'Fri, Apr 24', date: '',
    threads: [
      { tag: '#MorningRitual', preview: '7 of 8 done', time: '7:02 AM' },
      { tag: '#FitnessForToday', preview: 'Push day · new PR on bench', time: '8:00 AM' },
      { tag: '#FocusAndToDo', preview: '6 todos · all shipped', time: '9:00 AM' },
      { tag: '#Vent', preview: 'tired but proud', time: '6:00 PM' },
    ],
  },
  {
    label: 'Thu, Apr 23', date: '',
    threads: [
      { tag: '#MorningRitual', preview: '6 of 8', time: '7:10 AM' },
      { tag: '#DeepWork', preview: '3.5 hrs · roadmap doc draft 1', time: '10:00 AM' },
      { tag: '#Hydration', preview: '6 of 8 glasses', time: '8:00 PM' },
    ],
  },
  {
    label: 'Earlier this month', date: '',
    threads: [
      { tag: '#WeeklyReview', preview: 'Apr 13–19 · feeling steady', time: 'Apr 20' },
      { tag: '#WeeklyReview', preview: 'Apr 6–12 · scattered', time: 'Apr 13' },
      { tag: '#Reading', preview: 'finished Pilgrim at Tinker Creek', time: 'Apr 18' },
      { tag: '#Vent', preview: 'one of those weeks', time: 'Apr 14' },
      { tag: '#Gratitude', preview: 'spring · K · the new chair', time: 'Apr 11' },
    ],
  },
  {
    label: 'March 2026', date: '',
    threads: [
      { tag: '#WeeklyReview', preview: 'Mar 30–Apr 5', time: 'Apr 5' },
      { tag: '#WeeklyReview', preview: 'Mar 23–29', time: 'Mar 29' },
      { tag: '#WeeklyReview', preview: 'Mar 16–22', time: 'Mar 22' },
      { tag: '#MorningRitual', preview: 'streak hit 30 days', time: 'Mar 28' },
      { tag: '#FitnessForToday', preview: 'half marathon trial · 1:48', time: 'Mar 24' },
    ],
  },
];

export const SUGGESTED_NEW_TAGS = ['#WeeklyReview', '#Vent', '#Gratitude', '#Reading', '#DeepWork'];
