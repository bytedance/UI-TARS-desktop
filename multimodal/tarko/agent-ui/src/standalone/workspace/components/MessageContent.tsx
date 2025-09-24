import React from 'react';
import { MarkdownRenderer } from '@tarko/ui';

interface MessageContentProps {
  message: string;
  isMarkdown?: boolean;
  displayMode?: 'source' | 'rendered';
  isShortMessage?: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isMarkdown = false,
  displayMode = 'rendered',
  isShortMessage = false,
}) => {
  if (isMarkdown && displayMode === 'rendered') {
    return <MarkdownRenderer content={message} />;
  }

  return (
    <div className={`whitespace-pre-wrap ${isShortMessage ? 'text-sm' : ''}`}>
      {message}
    </div>
  );
};