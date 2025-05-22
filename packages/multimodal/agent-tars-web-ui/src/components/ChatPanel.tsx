import React, { useRef, useEffect, useState } from 'react';
import { useSessionStore } from '../store';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { FiInfo, FiMessageSquare, FiArrowDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatPanelProps {
  isPanelCollapsed: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isPanelCollapsed }) => {
  const { activeSessionId, messages, isProcessing } = useSessionStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const activeMessages = activeSessionId ? messages[activeSessionId] || [] : [];

  // Scroll handling
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

      // Check if user is already at bottom before scrolling
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 30;

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

  // Welcome screen animations
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
              className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white dark:border-gray-900"
            >
              <FiMessageSquare className="text-white text-2xl" />
            </motion.div>
            <motion.h2
              variants={itemVariants}
              className="text-xl font-display font-bold mb-3 bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent"
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
              className="flex items-center p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl mb-3 text-gray-600 dark:text-gray-400 text-sm border border-amber-100/40 dark:border-amber-800/20"
            >
              <FiInfo className="mr-3 text-amber-500 flex-shrink-0" />
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
            className="flex-1 overflow-y-auto px-5 py-4 overflow-x-hidden min-h-0 bg-gray-50/30 dark:bg-gray-900/10"
          >
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
                className="absolute bottom-24 right-6 bg-primary-500/90 text-white rounded-full p-2 border border-primary-400/30 dark:border-primary-600/30 shadow-sm dark:shadow-primary-900/10 transition-all duration-200 z-10"
              >
                <FiArrowDown />
              </motion.button>
            )}
          </AnimatePresence>

          <div className="p-4 border-t border-gray-200/30 dark:border-gray-800/20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
            <MessageInput isDisabled={!activeSessionId || isProcessing} />
          </div>
        </>
      )}
    </div>
  );
};
