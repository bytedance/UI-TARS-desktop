import React, { useRef, useEffect } from 'react';
import { useSession } from '@/common/hooks/useSession';
import { MessageGroup } from './Message/components/MessageGroup';
import { MessageInput } from './MessageInput';
import { ActionBar } from './ActionBar';
import { FiInfo, FiMessageSquare, FiRefreshCw, FiWifiOff, FiPlay, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtomValue } from 'jotai';
import { groupedMessagesAtom, messagesAtom } from '@/common/state/atoms/message';
import { replayStateAtom } from '@/common/state/atoms/replay';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useReplay } from '@/common/hooks/useReplay';

import './ChatPanel.css';
import { ResearchReportEntry } from './ResearchReportEntry';

/**
 * CountdownCircle component for better visual countdown
 */
const CountdownCircle: React.FC<{ seconds: number; total: number }> = ({ seconds, total }) => {
  const progress = ((total - seconds) / total) * 100;
  const circumference = 2 * Math.PI * 18; // radius = 18
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 40 40">
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-accent-500 dark:text-accent-400 transition-all duration-1000 ease-linear"
        />
      </svg>
      {/* Center number */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          key={seconds}
          initial={{ scale: 1.2, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-xl font-bold text-gray-700 dark:text-gray-300"
        >
          {seconds}
        </motion.span>
      </div>
    </div>
  );
};

/**
 * ChatPanel Component - Main chat interface with simplified replay logic and auto-play countdown
 */
export const ChatPanel: React.FC = () => {
  const { activeSessionId, isProcessing, connectionStatus, checkServerStatus } = useSession();
  const groupedMessages = useAtomValue(groupedMessagesAtom);
  const allMessages = useAtomValue(messagesAtom);
  const replayState = useAtomValue(replayStateAtom);
  const { isReplayMode, cancelAutoPlay } = useReplayMode();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Use messages from current session
  const activeMessages = activeSessionId ? groupedMessages[activeSessionId] || [] : [];

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

  // Find research report in session
  const findResearchReport = () => {
    if (!activeSessionId || !allMessages[activeSessionId]) return null;

    const sessionMessages = allMessages[activeSessionId];
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

  // Simplified empty state logic
  const shouldShowEmptyState = () => {
    // No active session
    if (!activeSessionId) return true;

    // Has messages - don't show empty state
    if (activeMessages.length > 0) return false;

    // In replay mode with events but no messages yet (waiting for playback to start)
    if (isReplayMode && replayState.events.length > 0 && replayState.currentEventIndex === -1) {
      return true;
    }

    // Default empty state
    return true;
  };

  const showEmptyState = shouldShowEmptyState();

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

            {/* Simplified empty state */}
            {showEmptyState ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center h-full"
              >
                <div className="text-center p-6 max-w-md">
                  {/* Enhanced auto-play countdown UI */}
                  {isReplayMode && replayState.autoPlayCountdown !== null ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="relative"
                    >
                      {/* Background card */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100/50 dark:border-gray-700/30">
                        {/* Countdown circle */}
                        <div className="flex justify-center mb-6">
                          <CountdownCircle seconds={replayState.autoPlayCountdown} total={3} />
                        </div>

                        {/* Title and description */}
                        <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
                          Auto-play starting
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                          Replay will begin in {replayState.autoPlayCountdown} second
                          {replayState.autoPlayCountdown !== 1 ? 's' : ''}. You can cancel or wait
                          for automatic playback.
                        </p>

                        {/* Enhanced cancel button */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={cancelAutoPlay}
                          className="inline-flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors border border-gray-200/50 dark:border-gray-600/50 shadow-sm"
                        >
                          <FiX size={14} className="mr-2" />
                          Cancel Auto-play
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <h3 className="text-lg font-display font-medium mb-2">
                        {isReplayMode && replayState.currentEventIndex === -1
                          ? 'Ready to replay'
                          : 'Start a conversation'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {isReplayMode && replayState.currentEventIndex === -1
                          ? 'Press play to start the replay or use the timeline to navigate'
                          : 'Ask Agent TARS a question or provide a command to begin.'}
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              // Display messages
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

          <div className="p-4">
            {researchReport && !isProcessing && (
              <div className="mb-4">
                <ResearchReportEntry
                  title={researchReport.title || 'Research Report'}
                  timestamp={researchReport.timestamp}
                  content={typeof researchReport.content === 'string' ? researchReport.content : ''}
                />
              </div>
            )}
            <ActionBar sessionId={activeSessionId} />
            {!isReplayMode && (
              <MessageInput
                isDisabled={
                  !activeSessionId || isProcessing || !connectionStatus.connected || isReplayMode
                }
                onReconnect={checkServerStatus}
                connectionStatus={connectionStatus}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
