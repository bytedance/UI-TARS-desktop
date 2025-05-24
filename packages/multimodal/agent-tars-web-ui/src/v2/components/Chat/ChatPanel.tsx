import React, { useRef, useEffect, useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { FiInfo, FiMessageSquare, FiArrowDown, FiRefreshCw } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { offlineModeAtom } from '../../state/atoms/ui';

/**
 * ChatPanel Component - Main chat interface
 *
 * Provides:
 * - Message display area with auto-scrolling
 * - Welcome screen when no session is active
 * - Connection status warnings
 * - Message input with send/abort functionality
 */
export const ChatPanel: React.FC = () => {
  const { activeSessionId, messages, isProcessing, connectionStatus, checkServerStatus } = useSession();
  const [offlineMode, setOfflineMode] = useAtom(offlineModeAtom);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const activeMessages = activeSessionId ? messages[activeSessionId] || [] : [];

  // Check scroll position to determine if scroll button should be shown
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

      // Auto-scroll if at bottom or if user sent the message
      if (isAtBottom || activeMessages[activeMessages.length - 1]?.role === 'user') {
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

  const renderOfflineBanner = () => {
    if (connectionStatus.connected || !activeSessionId) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm rounded-xl border border-yellow-100 dark:border-yellow-800/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Viewing in offline mode</div>
            <div className="text-sm mt-1">
              You can view previous messages but cannot send new ones until reconnected.
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => checkServerStatus()}
            className="ml-3 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-800/30 hover:bg-yellow-200 dark:hover:bg-yellow-700/40 rounded-lg text-sm font-medium transition-colors flex items-center"
          >
            <FiRefreshCw className={`mr-1.5 ${connectionStatus.reconnecting ? 'animate-spin' : ''}`} size={14} />
            {connectionStatus.reconnecting ? 'Reconnecting...' : 'Reconnect'}
          </motion.button>
        </div>
      </motion.div>
    );
  };

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
              className="w-16 h-16 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white dark:border-gray-900"
            >
              <FiMessageSquare className="text-white text-2xl" />
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
              className="flex items-center p-4 bg-gray-50/50 dark:bg-gray-800/10 rounded-2xl mb-3 text-gray-600 dark:text-gray-400 text-sm border border-gray-200/40 dark:border-gray-700/20"
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
            className="flex-1 overflow-y-auto px-5 py-4 overflow-x-hidden min-h-0 bg-gray-50/30 dark:bg-gray-900/10 chat-scrollbar"
          >
            {renderOfflineBanner()}
            
            <AnimatePresence>
              {!connectionStatus.connected && !activeSessionId && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800/20"
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

            {/* Empty state */}
            {activeMessages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center h-full"
              >
                <div className="text-center p-6 max-w-md">
                  <h3 className="text-lg font-display font-medium mb-2">Start a conversation</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Ask TARS a question or provide a command to begin.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4 pb-2">
                {activeMessages.map((message) => (
                  <Message key={message.id} message={message} />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                whileHover={{ y: -2 }}
                onClick={scrollToBottom}
                className="absolute bottom-24 right-6 bg-gray-700/90 text-white rounded-full p-2 border border-gray-600/30 dark:border-gray-500/30 shadow-sm dark:shadow-gray-900/10 transition-all duration-200 z-10"
              >
                <FiArrowDown />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Message input area */}
          <div className="p-4 border-t border-gray-200/30 dark:border-gray-800/20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
            <MessageInput
              isDisabled={!activeSessionId || isProcessing || !connectionStatus.connected}
              onReconnect={checkServerStatus}
              connectionStatus={connectionStatus}
            />
          </div>
        </>
      )}
    </div>
  );
};