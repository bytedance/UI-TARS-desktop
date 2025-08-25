import React from 'react';
import { FiClock } from 'react-icons/fi';
import { formatTimestamp } from '@/common/utils/formatters';
import { MessageTimestamp } from './MessageTimestamp';
import { LLMMetricDisplay } from './LLMMetricDisplay';
import { Message as MessageType } from '@/common/types';

interface MessageFooterProps {
  message: MessageType;
  className?: string;
}

/**
 * MessageFooter Component
 * Displays timestamp, copy functionality, and TTFT information for messages
 */
export const MessageFooter: React.FC<MessageFooterProps> = ({ message, className = '' }) => {
  const showTTFT = message.role === 'assistant' && message.ttftMs !== undefined;

  return (
    <div className={`mt-1 mb-2 ${className}`}>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
        <div className="flex items-center gap-3">
          {/* Timestamp */}
          <div className="flex items-center">
            <FiClock size={10} className="mr-1" />
            {formatTimestamp(message.timestamp)}
          </div>

          {/* TTFT Display - integrated into footer with consistent styling */}
          {showTTFT && <LLMMetricDisplay ttftMs={message.ttftMs} ttltMs={message.ttltMs} />}
        </div>

        {/* Copy functionality */}
        <MessageTimestamp
          timestamp={message.timestamp}
          content={message.content}
          role={message.role}
          inlineStyle={true}
        />
      </div>
    </div>
  );
};
