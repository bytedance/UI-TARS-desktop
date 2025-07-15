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
 * MessageGroup Component - 重构版以支持流式渲染
 *
 * 设计原则:
 * - 每条消息独立渲染，避免阻塞
 * - 保持简洁的视觉层次结构
 * - 消息间的视觉关系通过样式而非嵌套实现
 */
export const MessageGroup: React.FC<MessageGroupProps> = ({ messages, isThinking }) => {
  // 过滤掉环境消息
  const filteredMessages = messages.filter((msg) => msg.role !== 'environment');

  // 如果过滤后没有消息，则不渲染任何内容
  if (filteredMessages.length === 0) {
    return null;
  }

  // 获取用户消息和助手消息
  const userMessages = filteredMessages.filter((msg) => msg.role === 'user');
  const assistantMessages = filteredMessages.filter(
    (msg) => msg.role === 'assistant' || msg.role === 'final_answer' || msg.role === 'system',
  );

  // 获取最后一条助手消息（用于时间戳和复制功能）
  const lastResponseMessage =
    assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;

  return (
    <div>
      {/* 渲染用户消息 - 处理多模态内容的拆分 */}
      {userMessages.map((userMsg) => {
        if (isMultimodalContent(userMsg.content)) {
          const imageContents = userMsg.content.filter((part) => part.type === 'image_url');
          const textContents = userMsg.content.filter((part) => part.type === 'text');

          // 同时包含图片和文本时拆分显示
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

        // 普通用户消息
        return <Message key={userMsg.id} message={userMsg} />;
      })}

      {/* 渲染所有助手消息 - 每条消息独立渲染，支持流式展示 */}
      {assistantMessages.map((message, index) => (
        <Message
          key={message.id}
          message={message}
          // 移除 isIntermediate 属性，让每条消息都使用一致的样式
          isInGroup={true}
          // 只有最后一条消息且非思考状态时显示时间戳
          shouldDisplayTimestamp={index === assistantMessages.length - 1 && !isThinking}
        />
      ))}

      {/* 时间戳和复制功能 */}
      {!isThinking && lastResponseMessage && (
        <div className="mt-1 mb-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
            <div className="flex items-center">
              <FiClock size={10} className="mr-1" />
              {formatTimestamp(lastResponseMessage.timestamp)}
            </div>

            {/* 集成复制功能按钮 - 现在使用最后一条消息 */}
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
