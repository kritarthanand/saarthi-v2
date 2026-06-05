import type React from 'react';

import { MorningRitualSummary } from '@/components/thread/MorningRitualSummary';
import { EveningRitualSummary } from '@/components/thread/EveningRitualSummary';
import { WeeklyRitualSummary } from '@/components/thread/WeeklyRitualSummary';
import { ThreadTemplate } from './threads';
import type { Entry, EntryItem, EntryMessage } from './threads';

export type SummaryViewProps = {
  entry: Entry;
  items: EntryItem[];
  messages: EntryMessage[];
  onToggle?: (itemId: string, done: boolean) => void;
  onSendMessage?: (text: string, itemId?: string) => void;
  onSuggestionChoice?: (message: EntryMessage, chipLabel: string) => void;
  readOnly?: boolean;
};

type TemplateConfig = {
  tag: string;
  title: string;
  SummaryView: React.ComponentType<SummaryViewProps>;
};

export const TEMPLATE_REGISTRY: Record<ThreadTemplate, TemplateConfig> = {
  [ThreadTemplate.MorningRitual]: {
    tag: '#MorningRitual',
    title: 'Morning Ritual',
    SummaryView: MorningRitualSummary,
  },
  [ThreadTemplate.EveningRitual]: {
    tag: '#EveningRitual',
    title: 'Evening Ritual',
    SummaryView: EveningRitualSummary,
  },
  [ThreadTemplate.WeeklyRitual]: {
    tag: '#WeeklyRitual',
    title: 'Weekly Ritual',
    SummaryView: WeeklyRitualSummary,
  },
};

export const TAG_TO_TEMPLATE: Partial<Record<string, ThreadTemplate>> = {
  '#MorningRitual': ThreadTemplate.MorningRitual,
  '#EveningRitual': ThreadTemplate.EveningRitual,
  '#WeeklyRitual': ThreadTemplate.WeeklyRitual,
};
