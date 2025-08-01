import React from 'react';
import { Message as MessageType } from '@/common/types';
import { Message } from '../index';
import { FiClock } from 'react-icons/fi';
import { formatTimestamp } from '@/common/utils/formatters';
import { isMultimodalContent } from '@/common/utils/typeGuards';
import { MessageTimestamp } from './MessageTimestamp';
// import { ThinkingAnimation } from './ThinkingAnimation';

interface MessageGroupProps {
  messages: MessageType[];
  isThinking: boolean;
}

/**
 * MessageGroup Component - Refactored version to support streaming rendering
 *
 * Design principles:
 * - Each message renders independently to avoid blocking
 * - Maintain clean visual hierarchy
 * - Visual relationships between messages are implemented through styles rather than nesting
 */
export const MessageGroup: React.FC<MessageGroupProps> = ({ messages, isThinking }) => {
  // Filter out environment messages
  const filteredMessages = messages.filter((msg) => msg.role !== 'environment');

  // If no messages after filtering, render nothing
  if (filteredMessages.length === 0) {
    return null;
  }

  // Get user messages and assistant messages
  const userMessages = filteredMessages.filter((msg) => msg.role === 'user');
  const assistantMessages = filteredMessages.filter(
    (msg) => msg.role === 'assistant' || msg.role === 'final_answer' || msg.role === 'system',
  );

  // Get the last assistant message (for timestamp and copy functionality)
  const lastResponseMessage =
    assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;

  return (
    <div>
      {/* Render user messages - handle multimodal content splitting */}
      {userMessages.map((userMsg) => {
        if (isMultimodalContent(userMsg.content)) {
          const imageContents = userMsg.content.filter((part) => part.type === 'image_url');
          const textContents = userMsg.content.filter((part) => part.type === 'text');

          // Split display when containing both images and text
          if (imageContents.length > 0 && textContents.length > 0) {
            return (
              <React.Fragment key={userMsg.id}>
                <Message
                  message={{
                    ...userMsg,
                    content: imageContents,
                    id: `${userMsg.id}-images`,
                  }}
                />
                <Message
                  message={{
                    ...userMsg,
                    content: textContents,
                    id: `${userMsg.id}-text`,
                  }}
                />
              </React.Fragment>
            );
          }
        }

        // Regular user message
        return <Message key={userMsg.id} message={userMsg} />;
      })}

      {/* Render all assistant messages - each message renders independently, supporting streaming display */}
      {assistantMessages.map((message, index) => (
        <Message
          key={message.id}
          message={message}
          // Remove isIntermediate property, let each message use consistent styling
          isInGroup={true}
          // Only show timestamp for the last message when not in thinking state
          shouldDisplayTimestamp={index === assistantMessages.length - 1 && !isThinking}
        />
      ))}

      {/* Timestamp and copy functionality */}
      {!isThinking && lastResponseMessage && (
        <div className="mt-1 mb-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
            <div className="flex items-center">
              <FiClock size={10} className="mr-1" />
              {formatTimestamp(lastResponseMessage.timestamp)}
            </div>

            {/* Integrated copy function button - now uses the last message */}
            <MessageTimestamp
              timestamp={lastResponseMessage.timestamp}
              content={lastResponseMessage.content}
              role={lastResponseMessage.role}
              inlineStyle={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
