import type React from 'react';

import { MorningRitualSummary } from '@/components/thread/MorningRitualSummary';
import { EveningRitualSummary } from '@/components/thread/EveningRitualSummary';
import { WeeklyRitualSummary } from '@/components/thread/WeeklyRitualSummary';
import { FreeformSummaryView } from '@/components/thread/FreeformSummaryView';

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
};

