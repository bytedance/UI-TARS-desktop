import React, { useRef, useEffect, useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { MessageGroup } from './Message/components/MessageGroup';
import { MessageInput } from './MessageInput';
import {
  FiInfo,
  FiMessageSquare,
  FiArrowDown,
  FiRefreshCw,
  FiWifiOff,
  FiFileText,
  FiClock,
  FiX,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom, useAtomValue } from 'jotai';
import { offlineModeAtom } from '../../state/atoms/ui';
import { groupedMessagesAtom, messagesAtom } from '../../state/atoms/message';

import { useReplay } from '../../hooks/useReplay';
import { replayStateAtom } from '../../state/atoms/replay';
import { MessageGroup as MessageGroupType } from '../../types';
import { usePro } from '../../hooks/usePro';
import { ShareButton } from '../Share';
import { useReplayMode } from '../../context/ReplayModeContext';

import './ChatPanel.css';
import { apiService } from '@/v2/services/apiService';
import { ResearchReportEntry } from './ResearchReportEntry';

import { useLocation } from 'react-router-dom';

/**
 * ChatPanel Component - Main chat interface
 *
 * Design principles:
 * - Clean, distraction-free message display area with ample whitespace
 * - Elegant loading indicators and status messages with subtle animations
 * - Visually distinct message bubbles with refined spacing
 * - Clear visual hierarchy through typography and subtle borders
 */
export const ChatPanel: React.FC = () => {
  const { activeSessionId, isProcessing, connectionStatus, checkServerStatus } = useSession();

  const groupedMessages = useAtomValue(groupedMessagesAtom);
  const allMessages = useAtomValue(messagesAtom);
  const [offlineMode, setOfflineMode] = useAtom(offlineModeAtom);

  const [replayState] = useAtom(replayStateAtom);
  const isReplayMode = useReplayMode();
  const { cancelAutoPlay } = useReplay();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const location = useLocation();

  const isProMode = usePro();

  // 使用当前会话的消息 - 这样与正常渲染保持一致
  // 回放模式下会通过 processEvent 来更新这些消息
  const activeMessages = activeSessionId ? groupedMessages[activeSessionId] || [] : [];

  // 检查滚动位置以确定是否显示滚动按钮
  useEffect(() => {
    const checkScroll = () => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
      setShowScrollButton(!atBottom);
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;

      // Check if user is already at bottom
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 30;

      // Auto-scroll if at bottom or if new user message
      if (
        isAtBottom ||
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
  }, [activeMessages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

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

  // Add loading indicator component with improved visibility
  const renderLoadingIndicator = () => {
    if (!isProcessing) return null;

    // Determine if there are already messages to show a different style
    const hasMessages = activeSessionId && activeMessages.length > 0;

    if (!hasMessages) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-3xl mb-4 border border-gray-100/40 dark:border-gray-700/20"
      >
        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200/40 dark:border-gray-700/20 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-accent-500 animate-pulse" />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300">Agent TARS is thinking...</span>
      </motion.div>
    );
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

  // 新增：查找会话中的研究报告
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
              <div className="space-y-6 pb-2">
                {activeMessages.map((group, index) => (
                  <MessageGroup
                    key={`group-${index}-${group.messages[0].id}`}
                    messages={group.messages}
                    isThinking={
                      isProcessing && !replayState.isActive && index === activeMessages.length - 1
                    }
                  />
                ))}
              </div>
            )}

            {/* Add loading indicator */}
            {renderLoadingIndicator()}

            <div ref={messagesEndRef} />
          </div>

          {/* 消息输入区域 */}
          <div className="p-4">
            {/* 新增：研究报告入口 */}
            {researchReport && !isProcessing && (
              <div className="mb-4">
                <ResearchReportEntry
                  title={researchReport.title || 'Research Report'}
                  timestamp={researchReport.timestamp}
                  content={typeof researchReport.content === 'string' ? researchReport.content : ''}
                />
              </div>
            )}

            {/* 按钮区域 - 移除分享按钮 */}
            <div className="flex justify-center gap-3 mb-3">
              {/* 分享按钮已移至Navbar */}
            </div>

            <MessageInput
              isDisabled={
                !activeSessionId || isProcessing || !connectionStatus.connected || isReplayMode
              }
              onReconnect={checkServerStatus}
              connectionStatus={connectionStatus}
            />
          </div>
        </>
      )}
    </div>
  );
};