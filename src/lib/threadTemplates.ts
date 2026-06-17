import type React from 'react';

import { MorningRitualSummary } from '@/components/thread/MorningRitualSummary';
import { EveningRitualSummary } from '@/components/thread/EveningRitualSummary';
import { WeeklyRitualSummary } from '@/components/thread/WeeklyRitualSummary';
import { FreeformSummaryView } from '@/components/thread/FreeformSummaryView';
import { MealLoggingSummary } from '@/components/thread/MealLoggingSummary';
import { WorkoutLoggingSummary } from '@/components/thread/WorkoutLoggingSummary';
import { FocusTimeSummary } from '@/components/thread/FocusTimeSummary';
import { CleanRitualSummary } from '@/components/thread/CleanRitualSummary';
import { CatchUpSummary } from '@/components/thread/CatchUpSummary';

import type { CoachId, Thread, Task, TaskStatus, ThreadMessage } from './threads';

export type TemplateCadence = 'daily' | 'weekly' | 'none';
export type TemplateCreation = 'scheduled' | 'api';

export type SeedTask = {
  title: string;
  points: number;
  section?: string;
  priority?: 'high' | 'med' | 'low';
  meta?: Record<string, unknown>;
};

export type SummaryViewProps = {
  thread: Thread;
  tasks: Task[];
  messages: ThreadMessage[];
  onToggleTask?: (taskId: string, status: TaskStatus) => void;
  onSendMessage?: (text: string, taskRef?: string) => void;
  onSuggestionChoice?: (message: ThreadMessage, chipLabel: string) => void;
  readOnly?: boolean;
};

export type TemplateConfig = {
  cadence: TemplateCadence;
  creation: TemplateCreation;
  tag: string;
  title: string;
  sections?: string[];        // ordered list of section names
  defaultCoach: CoachId;
  seedTasks: SeedTask[];
  carryOver: boolean;         // whether undone tasks roll to next occurrence
  // Knowledge-bank source ids this template links to (display/docs only — the
  // server is the source of truth, see server/knowledge/links.py
  // TEMPLATE_KNOWLEDGE). Resolved per-thread via GET /threads/{id}/knowledge.
  knowledge?: string[];
  SummaryView: React.ComponentType<SummaryViewProps>;
};

export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  morning_ritual: {
    cadence: 'daily',
    creation: 'scheduled',
    tag: '#MorningRitual',
    title: 'Morning Ritual',
    defaultCoach: 'arjun',
    carryOver: false,
    seedTasks: [
      { title: 'Weight measurement',         points: 2,  meta: { type: 'health' } },
      { title: 'Dental Care',                points: 2,  meta: { type: 'health' } },
      { title: 'Shower',                     points: 4,  meta: { type: 'health' } },
      { title: 'Skin Care',                  points: 3,  meta: { type: 'health' } },
      { title: 'Dress + Puja',               points: 5,  meta: { type: 'ritual' } },
      { title: 'Pills',                      points: 3,  meta: { type: 'health' } },
      { title: 'Get Water',                  points: 2,  meta: { type: 'health' } },
      { title: 'Defrost food',               points: 2,  meta: { type: 'health' } },
      { title: 'Review Weekly Goals',        points: 5,  meta: { type: 'reflection' } },
      { title: 'Visualize',                  points: 5,  meta: { type: 'meditation' } },
      { title: 'Top 3 Goals for the day',    points: 8,  meta: { type: 'reflection' } },
      { title: 'Time Block for the day',     points: 6,  meta: { type: 'reflection' } },
      { title: 'Read 10 min',                points: 5,  meta: { type: 'learning' } },
    ],
    SummaryView: MorningRitualSummary,
  },

  evening_ritual: {
    cadence: 'daily',
    creation: 'scheduled',
    tag: '#EveningRitual',
    title: 'Evening Ritual',
    defaultCoach: 'nakula',
    carryOver: false,
    seedTasks: [
      { title: 'Meal Logs for the day',              points: 5, meta: { type: 'health' } },
      { title: 'Workout for the day',                points: 5, meta: { type: 'health' } },
      { title: 'Review top 3 priorities for the day', points: 8, meta: { type: 'reflection' } },
      { title: 'Review focus sessions',              points: 5, meta: { type: 'reflection' } },
      { title: 'Plan the next day',                  points: 8, meta: { type: 'reflection' } },
    ],
    SummaryView: EveningRitualSummary,
  },

  weekly_ritual: {
    cadence: 'weekly',
    creation: 'scheduled',
    tag: '#WeeklyRitual',
    title: 'Weekly Ritual',
    sections: ['review', 'plan'],
    defaultCoach: 'yudi',
    carryOver: false,
    seedTasks: [
      // review section
      { title: '3 biggest wins',                section: 'review', points: 5, meta: { type: 'reflection' } },
      { title: 'What drained you',              section: 'review', points: 5, meta: { type: 'reflection' } },
      { title: 'Where did you lose focus',      section: 'review', points: 5, meta: { type: 'reflection' } },
      { title: "One thing you're proud of",     section: 'review', points: 5, meta: { type: 'reflection' } },
      { title: 'Which habit needs attention',   section: 'review', points: 5, meta: { type: 'reflection' } },
      // plan section
      { title: 'Most important thing this week', section: 'plan', points: 5, meta: { type: 'goals' } },
      { title: 'Which habits to protect',        section: 'plan', points: 5, meta: { type: 'goals' } },
      { title: 'What to do differently',         section: 'plan', points: 5, meta: { type: 'reflection' } },
      { title: 'Blocks to watch for',            section: 'plan', points: 5, meta: { type: 'goals' } },
    ],
    SummaryView: WeeklyRitualSummary,
  },

  freeform: {
    cadence: 'none',
    creation: 'api',
    tag: '#Thread',
    title: 'Thread',
    defaultCoach: 'arjun',
    carryOver: false,
    seedTasks: [],
    SummaryView: FreeformSummaryView,
  },

  meal_logging: {
    cadence: 'daily',
    creation: 'scheduled',
    tag: '#MealLog',
    title: 'Meal Log',
    defaultCoach: 'bheem',
    carryOver: false,
    knowledge: ['recipes'],   // linked recipe & macro bank — see server/knowledge/
    seedTasks: [
      { title: 'Log breakfast',         points: 3, meta: { type: 'nutrition' } },
      { title: 'Log lunch',             points: 3, meta: { type: 'nutrition' } },
      { title: 'Log dinner',            points: 3, meta: { type: 'nutrition' } },
      { title: 'Log snacks',            points: 2, meta: { type: 'nutrition' } },
      { title: 'Track water intake',    points: 2, meta: { type: 'nutrition' } },
      { title: 'Log calories / macros', points: 4, meta: { type: 'nutrition' } },
    ],
    SummaryView: MealLoggingSummary,
  },

  workout_logging: {
    cadence: 'none',
    creation: 'api',
    tag: '#WorkoutLog',
    title: 'Workout',
    defaultCoach: 'bheem',
    carryOver: false,
    seedTasks: [
      { title: 'Warm up — 5-10 min',           points: 3, meta: { type: 'fitness' } },
      { title: 'Main workout',                  points: 8, meta: { type: 'fitness' } },
      { title: 'Cool down + stretch',           points: 3, meta: { type: 'fitness' } },
      { title: 'Log sets, reps, or time',       points: 4, meta: { type: 'fitness' } },
      { title: 'Hydration check',               points: 2, meta: { type: 'fitness' } },
    ],
    SummaryView: WorkoutLoggingSummary,
  },

  focus_time: {
    cadence: 'none',
    creation: 'api',
    tag: '#FocusTime',
    title: 'Focus Session',
    defaultCoach: 'arjun',
    carryOver: false,
    seedTasks: [
      { title: 'Set intention — what will you finish?', points: 5, meta: { type: 'focus' } },
      { title: 'Eliminate distractions',                points: 4, meta: { type: 'focus' } },
      { title: 'Focus block 1 — 45-90 min',            points: 8, meta: { type: 'focus' } },
      { title: 'Short break — 5-15 min',               points: 2, meta: { type: 'focus' } },
      { title: 'Focus block 2 — 45 min',               points: 6, meta: { type: 'focus' } },
      { title: 'Capture notes + progress',             points: 5, meta: { type: 'focus' } },
    ],
    SummaryView: FocusTimeSummary,
  },

  clean_ritual: {
    cadence: 'weekly',
    creation: 'scheduled',
    tag: '#CleanRitual',
    title: 'Clean Ritual',
    defaultCoach: 'yudi',
    carryOver: false,
    seedTasks: [
      { title: 'Tidy desk + workspace', points: 5, meta: { type: 'clean' } },
      { title: 'Kitchen clean-up',      points: 5, meta: { type: 'clean' } },
      { title: 'Vacuum / sweep floors', points: 4, meta: { type: 'clean' } },
      { title: 'Bathroom wipe-down',    points: 4, meta: { type: 'clean' } },
      { title: 'Do laundry',            points: 4, meta: { type: 'clean' } },
      { title: 'Take out trash',        points: 3, meta: { type: 'clean' } },
    ],
    SummaryView: CleanRitualSummary,
  },

  catch_up: {
    cadence: 'weekly',
    creation: 'scheduled',
    tag: '#CatchUp',
    title: 'Catch Up',
    defaultCoach: 'yudi',
    carryOver: true,
    seedTasks: [
      { title: 'Check in with family',                         points: 8, meta: { type: 'people' } },
      { title: 'Reach out to a close friend',                  points: 8, meta: { type: 'people' } },
      { title: 'Follow up on open threads with people',        points: 5, meta: { type: 'people' } },
      { title: 'Reconnect with someone you haven\'t spoken to', points: 5, meta: { type: 'people' } },
    ],
    SummaryView: CatchUpSummary,
  },
};

