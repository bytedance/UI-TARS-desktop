import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message as MessageType } from '../../types';
import { useSession } from '../../hooks/useSession';
import { Markdown } from '../shared/Markdown';

interface MessageProps {
  message: MessageType;
}

/**
 * 消息组件
 * 显示单个消息，支持不同类型的消息样式和内容
 */
export const Message: React.FC<MessageProps> = ({ message }) => {
  const [showThinking, setShowThinking] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const { setActivePanelContent } = useSession();

  const isMultimodal = Array.isArray(message.content);

  // 处理工具调用点击 - 在面板中显示相应的结果
  const handleToolCallClick = (toolCall: any) => {
    // 查找相应的工具结果
    if (message.toolResults && message.toolResults.length > 0) {
      const result = message.toolResults.find((r) => r.toolCallId === toolCall.id);
      if (result) {
        setActivePanelContent({
          type: result.type,
          source: result.content,
          title: result.name,
          timestamp: result.timestamp,
          toolCallId: result.toolCallId,
          error: result.error,
        });
      }
    }
  };

  // 处理多模态内容（文本 + 图片）
  const renderMultimodalContent = (content: any[]) => {
    return content.map((part, index) => {
      if (part.type === 'text') {
        return <Markdown key={index}>{part.text}</Markdown>;
      }

      // 对于图像部分，显示占位符并使其可点击
      if (part.type === 'image_url') {
        return (
          <motion.div
            key={index}
            whileHover={{ scale: 1.01 }}
            onClick={() =>
              setActivePanelContent({
                type: 'image',
                source: part.image_url.url,
                title: part.image_url.alt || 'Image',
                timestamp: message.timestamp,
              })
            }
            className="group p-2 border border-gray-200/30 dark:border-gray-700/30 rounded-2xl mt-2 mb-2 cursor-pointer hover:bg-gray-100/60 dark:hover:bg-gray-700/40 transition-all duration-200"
          >
            <div className="flex items-center gap-2 text-primary-500 dark:text-primary-400">
              <svg
                className="text-sm"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span className="text-sm font-medium">View image</span>
              <svg
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </motion.div>
        );
      }

      return null;
    });
  };

  // 渲染消息内容
  const renderContent = () => {
    if (isMultimodal) {
      return renderMultimodalContent(message.content as any[]);
    }

    // 对于助手消息，如果它包含工具调用，先显示摘要
    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      const contentStr = message.content as string;
      // 仅提取第一段或摘要
      const summary = contentStr.split('\n')[0];

      return (
        <>
          <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
            <Markdown>{summary}</Markdown>
          </div>

          <AnimatePresence>
            {showSteps && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-2"
              >
                <div className="prose dark:prose-invert prose-sm max-w-none text-sm border-t border-gray-200/20 dark:border-gray-700/20 pt-2 mt-2">
                  <Markdown>{contentStr.substring(summary.length)}</Markdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {contentStr.length > summary.length && (
            <motion.button
              whileHover={{ x: 3 }}
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 mt-1 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-700/30 transition-all duration-200"
            >
              {showSteps ? (
                <svg
                  className="mr-1.5"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              ) : (
                <svg
                  className="mr-1.5"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              )}
              {showSteps ? 'Hide detailed steps' : 'Show detailed steps'}
            </motion.button>
          )}
        </>
      );
    }

    return <Markdown>{message.content as string}</Markdown>;
  };

  // 渲染工具调用为交互式按钮
  const renderToolCalls = () => {
    if (!message.toolCalls || message.toolCalls.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Tools used:
        </div>
        <AnimatePresence>
          {message.toolCalls.map((toolCall, index) => (
            <motion.button
              key={toolCall.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
              whileHover={{ scale: 1.01, x: 3 }}
              onClick={() => handleToolCallClick(toolCall)}
              className="group flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50/80 dark:bg-gray-700/60 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-all duration-200 w-full text-left border border-gray-200/30 dark:border-gray-600/20"
            >
              <svg
                className="text-primary-500 flex-shrink-0"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
              <div className="truncate">{toolCall.function.name}</div>
              <svg
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  const messageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={messageVariants}
      className={`flex gap-4 message-gap ${
        message.role === 'user'
          ? 'justify-end'
          : message.role === 'system'
            ? 'justify-center'
            : 'justify-start'
      }`}
    >
      <div
        className={`${
          message.role === 'user'
            ? 'max-w-[85%] bg-gray-100/70 dark:bg-gray-800/30 text-gray-900 dark:text-gray-100 border border-gray-200/40 dark:border-gray-700/30 shadow-sm'
            : message.role === 'system'
              ? 'max-w-full bg-gray-50/50 dark:bg-gray-800/20 text-gray-700 dark:text-gray-300 border border-gray-200/30 dark:border-gray-700/20'
              : 'max-w-[85%] bg-white/98 dark:bg-gray-800/98 border border-gray-200/30 dark:border-gray-700/20 text-gray-800 dark:text-gray-200 shadow-sm'
        } rounded-2xl p-4`}
      >
        {message.role !== 'system' && (
          <div className="flex items-center gap-2 mb-2.5">
            {message.role === 'user' ? (
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200/80 dark:bg-gray-700/30">
                <svg
                  className="text-gray-600 dark:text-gray-400 text-xs"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            ) : (
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200/80 dark:bg-gray-700/30">
                <svg
                  className="text-gray-600 dark:text-gray-400 text-xs"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
            )}
            <span className="font-medium text-sm">{message.role === 'user' ? 'You' : 'TARS'}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {message.role === 'system' ? (
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>{message.content}</span>
          </div>
        ) : (
          <>
            <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
              {renderContent()}
            </div>

            {renderToolCalls()}

            {message.thinking && (
              <div className="mt-3">
                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-700/30 transition-all duration-200"
                >
                  {showThinking ? (
                    <svg
                      className="mr-1.5"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  ) : (
                    <svg
                      className="mr-1.5"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  )}
                  <svg
                    className="mr-1.5"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                  </svg>
                  {showThinking ? 'Hide reasoning' : 'Show reasoning'}
                </motion.button>

                <AnimatePresence>
                  {showThinking && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 p-3 bg-gray-50/80 dark:bg-gray-700/40 rounded-xl text-xs font-mono overflow-x-auto border border-gray-200/30 dark:border-gray-600/20">
                        {message.thinking}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
