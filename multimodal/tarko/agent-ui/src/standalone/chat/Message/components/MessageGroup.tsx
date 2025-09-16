import React from 'react';
import { Message as MessageType } from '@/common/types';
import { Message } from '../index';
import { isMultimodalContent } from '@/common/utils/typeGuards';
import { MessageFooter } from './MessageFooter';
import { ThinkingAnimation } from '@tarko/ui';
import { useAtomValue } from 'jotai';
import { isProcessingAtom } from '@/common/state/atoms/ui';
import { getAgentTitle } from '@/config/web-ui-config';

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
  const isProcessing = useAtomValue(isProcessingAtom);

  // Filter out environment messages
  const filteredMessages = messages.filter((msg) => msg.role !== 'environment');

  // If no messages after filtering, render nothing
  if (filteredMessages.length === 0) {
    return null;
  }

  // Get user messages and assistant messages
  const userMessages = filteredMessages.filter((msg) => msg.role === 'user');
  const assistantMessages = filteredMessages.filter(
    (msg) => msg.role === 'assistant' || msg.role === 'system',
  );

  // Get the final assistant message (only completed responses, not intermediate tool calls)
  const finalResponseMessage = assistantMessages.find((msg) => msg.finishReason === 'stop') || null;

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

      {/* Simplified thinking animation */}
      {isThinking && (
        <div className="mt-4 space-y-4">
          <ThinkingAnimation text={`${getAgentTitle()} is running`} size="medium" />
        </div>
      )}

      {/* Message footer with timestamp, TTFT, and copy functionality */}
      {!isThinking && finalResponseMessage && <MessageFooter message={finalResponseMessage} />}
    </div>
  );
};
