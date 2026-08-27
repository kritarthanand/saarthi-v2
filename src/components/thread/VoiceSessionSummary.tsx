import type { SummaryViewProps } from '@/lib/threadTemplates';
import { ThreadChatTab } from './ThreadChatTab';

/**
 * Voice threads read as an ordinary conversation: each spoken clip is a user
 * message and the coach's reply follows it, both already timestamped. Nothing
 * here needs to know a message arrived by voice — the distinction lives in
 * `meta.voice` for the exporter, not the UI.
 *
 * Renders the message list only. A SummaryView is scroll *content*: ThreadDetail
 * wraps it in a ScrollView and owns the composer underneath. Rendering ThreadChat
 * here instead put a second composer on the screen (ThreadChat is a full-height
 * screen that brings its own) and collapsed the layout, since a flex:1 screen
 * nested inside a ScrollView has no height to fill.
 *
 * Typing a follow-up still works — through ThreadDetail's composer, the one that
 * was always meant to be there.
 */
export function VoiceSessionSummary({ thread, messages }: SummaryViewProps) {
  return <ThreadChatTab thread={thread} messages={messages} />;
}
