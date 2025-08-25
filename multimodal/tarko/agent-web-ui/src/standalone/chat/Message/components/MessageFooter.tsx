import React from 'react';
import { FiClock, FiCheck, FiCopy } from 'react-icons/fi';
import { formatTimestamp } from '@/common/utils/formatters';
import { Message as MessageType, ChatCompletionContentPart } from '@/common/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface MessageFooterProps {
  message: MessageType;
  className?: string;
}

/**
 * MessageFooter Component
 * Displays timestamp, copy functionality, and TTFT information for messages
 */
export const MessageFooter: React.FC<MessageFooterProps> = ({ message, className = '' }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const showTTFT = message.role === 'assistant' && message.ttftMs !== undefined;

  const handleCopy = () => {
    const textToCopy =
      typeof message.content === 'string'
        ? message.content
        : (message.content as ChatCompletionContentPart[])
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n');

    copyToClipboard(textToCopy);
  };

  // Helper function to format elapsed time for display
  const formatElapsedTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  return (
    <div className={`mt-1 mb-2 ${className}`}>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
        <div className="flex items-center gap-3">
          {/* Timestamp */}
          <div className="flex items-center">
            <FiClock size={10} className="mr-1" />
            {formatTimestamp(message.timestamp)}
          </div>

          {/* TTFT Display - simple gray style consistent with timestamp */}
          {showTTFT && (
            <div className="flex items-center" title={`TTFT: ${formatElapsedTime(message.ttftMs!)}${message.ttltMs && message.ttltMs !== message.ttftMs ? ` | Total: ${formatElapsedTime(message.ttltMs)}` : ''}`}>
              <span className="text-gray-500 dark:text-gray-400">
                {formatElapsedTime(message.ttftMs!)}
                {message.ttltMs && message.ttltMs !== message.ttftMs && (
                  <span className="opacity-60"> / {formatElapsedTime(message.ttltMs)}</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Copy functionality */}
        <button
          onClick={handleCopy}
          className="flex items-center text-gray-400 hover:text-accent-500 dark:hover:text-accent-400 transition-colors"
          title="Copy message"
        >
          {isCopied ? <FiCheck size={12} /> : <FiCopy size={12} />}
          <span className="ml-1">{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};
