import React from 'react';

import type { SummaryViewProps } from '@/lib/threadTemplates';
import { ThreadChat } from './ThreadChat';

/**
 * Voice threads read as an ordinary conversation: each spoken clip is a user
 * message and the coach's reply follows it, both already timestamped by
 * ThreadChat. Nothing here needs to know a message arrived by voice — the
 * distinction lives in `meta.voice` for the Obsidian exporter, not the UI.
 *
 * The composer stays live so you can follow up by typing without recording.
 */
export function VoiceSessionSummary({
  thread,
  tasks,
  messages,
  onSendMessage,
  readOnly,
}: SummaryViewProps) {
  const handleSend = React.useCallback(
    async (text: string, taskRef?: string) => {
      if (onSendMessage) {
        return onSendMessage(text, taskRef);
      }
    },
    [onSendMessage],
  );

  return (
    <ThreadChat
      thread={thread}
      tasks={tasks}
      messages={messages}
      onSend={handleSend}
      readOnly={readOnly}
    />
  );
}
