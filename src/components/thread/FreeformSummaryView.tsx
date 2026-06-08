import React from 'react';

import type { SummaryViewProps } from '@/lib/threadTemplates';
import { ThreadChat } from './ThreadChat';

export function FreeformSummaryView({
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
