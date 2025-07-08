import React, { useRef, useEffect } from 'react';
import { useSession } from '@/common/hooks/useSession';
import { MessageGroup } from './Message/components/MessageGroup';
import { MessageInput } from './MessageInput';
import { FilesDisplay } from './FilesDisplay';
import { FiInfo, FiMessageSquare, FiRefreshCw, FiWifiOff, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom, useAtomValue } from 'jotai';
import { groupedMessagesAtom, messagesAtom } from '@/common/state/atoms/message';

import { useReplay } from '@/common/hooks/useReplay';
import { replayStateAtom } from '@/common/state/atoms/replay';
import { useReplayMode } from '@/common/hooks/useReplayMode';

import './ChatPanel.css';
import { ResearchReportEntry } from './ResearchReportEntry';

/**
 * ChatPanel Component - Main chat interface
 *
 * 修改以支持实时流式渲染：
 * - 更新了消息渲染逻辑，使每条消息都能立即显示
 * - 优化了消息滚动和布局
 * - 保持了干净、无干扰的用户界面
 * - 新增文件展示功能
 */
export const ChatPanel: React.FC = () => {
  const { activeSessionId, isProcessing, connectionStatus, checkServerStatus } = useSession();

  const groupedMessages = useAtomValue(groupedMessagesAtom);
  const allMessages = useAtomValue(messagesAtom);

  const [replayState] = useAtom(replayStateAtom);
  const isReplayMode = useReplayMode();
  const { cancelAutoPlay } = useReplay();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 使用当前会话的消息
  const activeMessages = activeSessionId ? groupedMessages[activeSessionId] || [] : [];

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;

      // Check if user is already at bottom
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 30;

      // 修改滚动逻辑：处理中时总是滚动，以确保实时消息可见
      if (
        isAtBottom ||
        isProcessing ||
        (activeMessages.length > 0 &&
          activeMessages[activeMessages.length - 1].messages[0]?.role === 'user')
      ) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth',
          });
        }, 100);
      }
    }
  }, [activeMessages, isProcessing]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  const renderOfflineBanner = () => {
    if (connectionStatus.connected || !activeSessionId || isReplayMode) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 px-4 py-3 bg-red-50/30 dark:bg-red-900/15 text-red-700 dark:text-red-300 text-sm rounded-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium flex items-center">
              <FiWifiOff className="mr-2 text-red-500 dark:text-red-400" />
              Viewing in offline mode
            </div>
            <div className="text-sm mt-1">
              You can view previous messages but cannot send new ones until reconnected.
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => checkServerStatus()}
            className="ml-3 px-3 py-1.5 bg-red-100/70 dark:bg-red-800/30 hover:bg-red-200/70 dark:hover:bg-red-700/40 rounded-2xl text-sm font-medium transition-colors flex items-center border border-red-200/30 dark:border-red-700/30"
          >
            <FiRefreshCw
              className={`mr-1.5 ${connectionStatus.reconnecting ? 'animate-spin' : ''}`}
              size={14}
            />
            {connectionStatus.reconnecting ? 'Reconnecting...' : 'Reconnect'}
          </motion.button>
        </div>
      </motion.div>
    );
  };

  // 查找会话中的研究报告
  const findResearchReport = () => {
    if (!activeSessionId || !allMessages[activeSessionId]) return null;

    const sessionMessages = allMessages[activeSessionId];
    // 查找类型为 final_answer 且 isDeepResearch 为 true 的最后一条消息
    const reportMessage = [...sessionMessages]
      .reverse()
      .find(
        (msg) =>
          (msg.role === 'final_answer' || msg.role === 'assistant') &&
          msg.isDeepResearch === true &&
          msg.title,
      );

    return reportMessage;
  };

  const researchReport = findResearchReport();

  return (
    <div className="flex flex-col h-full">
      {!activeSessionId ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex items-center justify-center flex-1"
        >
          <div className="text-center p-6 max-w-md">
            <motion.div
              variants={itemVariants}
              className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gray-500 dark:text-gray-400 border border-gray-100/50 dark:border-gray-700/20"
            >
              <FiMessageSquare size={24} />
            </motion.div>
            <motion.h2
              variants={itemVariants}
              className="text-xl font-display font-bold mb-3 text-gray-800 dark:text-gray-200"
            >
              Welcome to Agent TARS
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="text-gray-600 dark:text-gray-400 mb-5 text-sm leading-relaxed"
            >
              Create a new chat session to get started with the AI assistant.
            </motion.p>
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -2 }}
              className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-2xl mb-3 text-gray-600 dark:text-gray-400 text-sm border border-gray-100/40 dark:border-gray-700/20"
            >
              <FiInfo className="mr-3 text-gray-400 flex-shrink-0" />
              <span>
                TARS can help with tasks involving web search, browsing, and file operations.
              </span>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <>
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-5 py-5 overflow-x-hidden min-h-0 chat-scrollbar relative"
          >
            {renderOfflineBanner()}

            <AnimatePresence>
              {!connectionStatus.connected && !activeSessionId && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-3xl border border-gray-100/40 dark:border-gray-700/20"
                >
                  <div className="font-medium">Server disconnected</div>
                  <div className="text-sm mt-1">
                    {connectionStatus.reconnecting
                      ? 'Attempting to reconnect...'
                      : 'Please check your connection and try again.'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 空状态 */}
            {activeMessages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center h-full"
              >
                <div className="text-center p-6 max-w-md">
                  <h3 className="text-lg font-display font-medium mb-2">
                    {replayState.isActive ? 'Replay starting...' : 'Start a conversation'}
                  </h3>
                  {replayState.isActive && replayState.autoPlayCountdown !== null ? (
                    <div className="mt-2">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        Auto-play in {replayState.autoPlayCountdown} seconds...
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={cancelAutoPlay}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/50 dark:border-gray-700/30 flex items-center mx-auto"
                      >
                        <FiX size={12} className="mr-1.5" />
                        Cancel auto-play
                      </motion.button>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {replayState.isActive
                        ? 'Please wait while the replay loads or press play to begin'
                        : 'Ask Agent TARS a question or provide a command to begin.'}
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              // 修改这里：使用动画包装每个消息组，使其能够立即显示
              <div className="space-y-6 pb-2">
                {activeMessages.map((group, index) => (
                  <AnimatePresence mode="popLayout" key={`group-${index}-${group.messages[0].id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <MessageGroup
                        messages={group.messages}
                        isThinking={
                          isProcessing &&
                          !replayState.isActive &&
                          index === activeMessages.length - 1
                        }
                      />
                    </motion.div>
                  </AnimatePresence>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 消息输入区域 */}
          {!isReplayMode && (
            <div className="p-4">
              {/* 文件显示 - 在输入框之前显示 */}
              {activeSessionId && <FilesDisplay sessionId={activeSessionId} />}

              {/* 研究报告入口 */}
              {researchReport && !isProcessing && (
                <div className="mb-4">
                  <ResearchReportEntry
                    title={researchReport.title || 'Research Report'}
                    timestamp={researchReport.timestamp}
                    content={
                      typeof researchReport.content === 'string' ? researchReport.content : ''
                    }
                  />
                </div>
              )}

              <MessageInput
                isDisabled={
                  !activeSessionId || isProcessing || !connectionStatus.connected || isReplayMode
                }
                onReconnect={checkServerStatus}
                connectionStatus={connectionStatus}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
