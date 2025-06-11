import React from 'react';
import { Message as MessageType } from '@/common/types';
import { Message } from '../index';
import { FiClock } from 'react-icons/fi';
import { formatTimestamp } from '@/common/utils/formatters';
import { isMultimodalContent } from '@/common/utils/typeGuards';
import { ThinkingAnimation } from './ThinkingAnimation';

interface MessageGroupProps {
  messages: MessageType[];
  isThinking: boolean;
}

/**
 * MessageGroup Component - Groups related messages in a thinking sequence
 *
 * Design principles:
 * - Minimalist design with no avatars or indentation
 * - Clean, full-width message layout
 * - All intermediate thinking steps are always visible
 * - Visual hierarchy emphasizing final answers
 * - Consistent monochromatic styling
 */
export const MessageGroup: React.FC<MessageGroupProps> = ({ messages, isThinking }) => {
  // 过滤掉环境消息
  const filteredMessages = messages.filter((msg) => msg.role !== 'environment');

  // 如果过滤后没有消息，则不渲染任何内容
  if (filteredMessages.length === 0) {
    return null;
  }

  // 如果只有一条消息，检查是否需要拆分
  if (filteredMessages.length === 1) {
    const message = filteredMessages[0];

    // 检查是否是包含图片和文本的多模态用户消息
    if (message.role === 'user' && isMultimodalContent(message.content)) {
      const imageContents = message.content.filter((part) => part.type === 'image_url');
      const textContents = message.content.filter((part) => part.type === 'text');

      // 只有同时包含图片和文本时才拆分显示
      if (imageContents.length > 0 && textContents.length > 0) {
        return (
          <div className="space-y-3">
            {/* 先显示图片消息 */}
            <Message
              key={`${message.id}-images`}
              message={{
                ...message,
                content: imageContents,
                id: `${message.id}-images`,
              }}
            />

            {/* 再显示文本消息 */}
            <Message
              key={`${message.id}-text`}
              message={{
                ...message,
                content: textContents,
                id: `${message.id}-text`,
              }}
            />
          </div>
        );
      }
    }

    return <Message message={filteredMessages[0]} />;
  }

  // 获取第一条消息 - 通常是用户消息
  const firstMessage = filteredMessages[0];

  // If not a user message, use simplified rendering
  if (firstMessage.role !== 'user') {
    return (
      <div className="space-y-3">
        {filteredMessages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isInGroup={index > 0 && index < filteredMessages.length - 1}
            isIntermediate={index > 0 && index < filteredMessages.length - 1}
            shouldDisplayTimestamp={false}
          />
        ))}
      </div>
    );
  }

  // For user-initiated groups, use enhanced rendering with thinking sequence

  const responseMessage = filteredMessages.length > 1 ? filteredMessages[1] : null;
  const intermediateMessages = filteredMessages.slice(2, -1);
  const lastMessage = filteredMessages[filteredMessages.length - 1];

  const hasFinalAnswer = lastMessage.role === 'assistant' && lastMessage.finishReason === 'stop';
  const finalMessage = hasFinalAnswer ? lastMessage : null;

  const hasThinkingSteps = intermediateMessages.length > 0;

  // 检查用户消息是否需要拆分
  if (isMultimodalContent(firstMessage.content)) {
    const imageContents = firstMessage.content.filter((part) => part.type === 'image_url');
    const textContents = firstMessage.content.filter((part) => part.type === 'text');

    // 只有同时包含图片和文本时才拆分显示
    if (imageContents.length > 0 && textContents.length > 0) {
      return (
        <div className="message-group-container space-y-3">
          {/* 先显示图片消息 */}
          <Message
            message={{
              ...firstMessage,
              content: imageContents,
              id: `${firstMessage.id}-images`,
            }}
          />

          {/* 再显示文本消息 */}
          <Message
            message={{
              ...firstMessage,
              content: textContents,
              id: `${firstMessage.id}-text`,
            }}
          />

          {/* Assistant response section with all assistant-related messages */}
          {responseMessage && (
            <div className="assistant-response-container">
              {/* Initial response message - marked as in-group */}
              <Message message={responseMessage} isInGroup={true} />

              {/* Thinking process section - always shown */}
              {hasThinkingSteps && (
                <div className="thinking-steps-container">
                  {intermediateMessages.map((msg) => (
                    <Message key={msg.id} message={msg} isIntermediate={true} isInGroup={true} />
                  ))}

                  {!isThinking && (
                    <div className="mt-1 mb-2">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 py-1">
                        <FiClock size={10} className="mr-1" />
                        {responseMessage && formatTimestamp(responseMessage.timestamp)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Final answer - if exists and not currently thinking */}
              {finalMessage && finalMessage !== responseMessage && !isThinking && (
                <Message message={finalMessage} isInGroup={false} />
              )}

              {/* Thinking indicator - 使用新的高级思考动画 */}
              {isThinking && (
                <div className="mt-2">
                  <ThinkingAnimation />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="message-group-container space-y-3">
      {/* User message is always displayed */}
      <Message message={firstMessage} />

      {/* Assistant response section with all assistant-related messages */}
      {responseMessage && (
        <div className="assistant-response-container">
          {/* Initial response message - marked as in-group */}
          <Message message={responseMessage} isInGroup={true} />

          {/* Thinking process section - always shown */}
          {hasThinkingSteps && (
            <div className="thinking-steps-container">
              {intermediateMessages.map((msg) => (
                <Message key={msg.id} message={msg} isIntermediate={true} isInGroup={true} />
              ))}

              {!isThinking && (
                <div className="mt-1 mb-2">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 py-1">
                    <FiClock size={10} className="mr-1" />
                    {responseMessage && formatTimestamp(responseMessage.timestamp)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Final answer - if exists and not currently thinking */}
          {finalMessage && finalMessage !== responseMessage && !isThinking && (
            <Message message={finalMessage} isInGroup={false} />
          )}

          {/* Thinking indicator - 使用新的高级思考动画 */}
          {isThinking && (
            <div className="mt-2">
              <ThinkingAnimation />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
