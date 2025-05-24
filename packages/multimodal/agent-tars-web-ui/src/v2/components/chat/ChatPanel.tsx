import React, { useRef, useEffect, useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { ConnectionAlert } from './ConnectionAlert';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import './ChatPanel.css';

interface ChatPanelProps {
  isPanelCollapsed: boolean;
}

/**
 * 聊天面板组件
 * 显示消息历史记录和输入控件
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ isPanelCollapsed }) => {
  const { activeSessionId, messages, isProcessing } = useSession();
  const { status: serverConnectionStatus } = useConnectionStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 确保基于activeSessionId获取正确的消息
  const activeMessages =
    activeSessionId && messages[activeSessionId] ? messages[activeSessionId] : [];

  // 滚动处理
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

  // 当会话ID变化时强制滚动到底部
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current?.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [activeSessionId]);

  // 当新消息到达时自动滚动
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;

      // 检查用户是否已经在底部
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

  // 欢迎界面动画
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
        <WelcomeScreen containerVariants={containerVariants} itemVariants={itemVariants} />
      ) : (
        <>
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-5 py-4 overflow-x-hidden min-h-0 bg-gray-50/30 dark:bg-gray-900/10 chat-scrollbar"
          >
            {/* 服务器断开连接消息 */}
            <ConnectionAlert serverConnectionStatus={serverConnectionStatus} />

            {activeMessages.length === 0 ? (
              isProcessing ? (
                <LoadingMessages />
              ) : (
                <EmptyConversation />
              )
            ) : (
              <div className="space-y-4 pb-2">
                {activeMessages.map((message) => (
                  <Message key={message.id} message={message} />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 滚动到底部按钮 */}
          <ScrollToBottomButton
            showScrollButton={showScrollButton}
            scrollToBottom={scrollToBottom}
          />

          <div className="p-4 border-t border-gray-200/30 dark:border-gray-800/20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
            <MessageInput
              isDisabled={!activeSessionId || isProcessing || !serverConnectionStatus.connected}
            />
          </div>
        </>
      )}
    </div>
  );
};

// 欢迎屏幕
const WelcomeScreen: React.FC<{ containerVariants: any; itemVariants: any }> = ({
  containerVariants,
  itemVariants,
}) => (
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
        <svg
          className="text-white text-2xl"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
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
        <svg
          className="mr-3 text-gray-400 flex-shrink-0"
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
        <span>TARS can help with tasks involving web search, browsing, and file operations.</span>
      </motion.div>
    </div>
  </motion.div>
);

// 空会话
const EmptyConversation: React.FC = () => (
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
);

// 滚动到底部按钮
const ScrollToBottomButton: React.FC<{ showScrollButton: boolean; scrollToBottom: () => void }> = ({
  showScrollButton,
  scrollToBottom,
}) => (
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
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="19 12 12 19 5 12"></polyline>
        </svg>
      </motion.button>
    )}
  </AnimatePresence>
);

// 加载消息组件
const LoadingMessages: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center justify-center h-full"
  >
    <div className="w-10 h-10 border-2 border-gray-300 dark:border-gray-700 border-t-primary-500 dark:border-t-primary-400 rounded-full animate-spin mb-3"></div>
    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading conversation...</p>
  </motion.div>
);
