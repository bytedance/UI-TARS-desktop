import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message as MessageType } from '../../../../types';
import { Message } from '../index';
import { FiChevronDown, FiChevronUp, FiClock, FiMessageSquare } from 'react-icons/fi';
import { formatTimestamp } from '../../../../utils/formatters';

interface MessageGroupProps {
  messages: MessageType[];
  isThinking: boolean;
}

/**
 * MessageGroup Component - Groups related messages in a thinking sequence
 *
 * Design principles:
 * - Collapsible interface for progressive disclosure of thinking steps
 * - Visual hierarchy emphasizing final answers over intermediate steps
 * - Compact layout for intermediate messages to reduce vertical space
 * - Consistent styling with subtle visual cues for grouping
 */
export const MessageGroup: React.FC<MessageGroupProps> = ({ messages, isThinking }) => {
  const [expanded, setExpanded] = useState(false);

  // 如果只有一条消息，直接渲染
  if (messages.length === 1) {
    return <Message message={messages[0]} />;
  }

  // 获取第一条和最后一条消息
  const firstMessage = messages[0];

  // 如果是用户消息，应该单独显示
  if (firstMessage.role === 'user') {
    // 获取响应消息 - 用户消息之后的第一条消息通常是助手回复
    const responseMessage = messages.length > 1 ? messages[1] : null;

    // 思考/处理步骤消息 - 中间消息，但不是最终答案
    const intermediateMessages = messages.slice(2, -1);

    // 最终答案消息 - 最后一条消息如果是finishReason=stop
    const lastMessage = messages[messages.length - 1];
    const hasFinalAnswer = lastMessage.role === 'assistant' && lastMessage.finishReason === 'stop';
    const finalMessage = hasFinalAnswer ? lastMessage : null;

    // 是否有思考步骤
    const hasThinkingSteps = intermediateMessages.length > 0;

    // 是否显示中间过程 - 展开状态或正在思考时
    const showIntermediate = expanded || isThinking;

    return (
      <div className="message-group-container space-y-1">
        {/* 用户消息始终显示 */}
        <Message message={firstMessage} />

        {/* 助手响应部分，包含所有助手相关消息 */}
        {responseMessage && (
          <div className="assistant-response-container">
            {/* 初始响应消息 - 标记为组内消息，不显示时间戳 */}
            <Message message={responseMessage} isInGroup={true} />

            {/* 思考过程部分 - 有内容且展开或思考中才显示 */}
            {hasThinkingSteps && (
              <>
                <AnimatePresence>
                  {showIntermediate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pl-10 space-y-1 overflow-hidden"
                    >
                      {intermediateMessages.map((msg) => (
                        <Message
                          key={msg.id}
                          message={msg}
                          isIntermediate={true}
                          isInGroup={true}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 展开/折叠按钮 - 仅在有思考步骤且不在思考中时显示 */}
                {!isThinking && (
                  <div className="pl-10 mt-1 mb-2">
                    <motion.button
                      whileHover={{ x: 3 }}
                      onClick={() => setExpanded(!expanded)}
                      className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 rounded-lg hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition-all duration-200"
                    >
                      {expanded ? (
                        <FiChevronUp className="mr-1.5" />
                      ) : (
                        <FiChevronDown className="mr-1.5" />
                      )}
                      {expanded ? '隐藏中间步骤' : '显示中间步骤'}
                      <span className="ml-2 text-gray-400 dark:text-gray-500 flex items-center">
                        <FiClock size={10} className="mr-1" />
                        {formatTimestamp(responseMessage.timestamp)}
                      </span>
                    </motion.button>
                  </div>
                )}
              </>
            )}

            {/* 最终答案 - 如果存在且不是当前正在思考 */}
            {finalMessage && finalMessage !== responseMessage && !isThinking && (
              <Message message={finalMessage} isInGroup={false} />
            )}

            {/* 思考中状态指示器 */}
            {isThinking && (
              <div className="pl-10 mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center bg-gray-50/70 dark:bg-gray-700/40 rounded-full w-5 h-5 mr-2 text-gray-500 dark:text-gray-400">
                  <div className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse"></div>
                </div>
                TARS 正在思考...
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 如果不是用户消息开头的组，使用默认渲染
  return (
    <div className="space-y-1">
      {messages.map((message, index) => (
        <Message
          key={message.id}
          message={message}
          isInGroup={index > 0 && index < messages.length - 1}
          isIntermediate={index > 0 && index < messages.length - 1}
        />
      ))}
    </div>
  );
};