import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import { FiSend, FiX, FiRefreshCw, FiPaperclip, FiImage, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionStatus } from '../../types';

interface MessageInputProps {
  isDisabled?: boolean;
  onReconnect?: () => void;
  connectionStatus?: ConnectionStatus;
}

/**
 * MessageInput Component - Input for sending messages
 *
 * Provides:
 * - Auto-expanding textarea for input
 * - Permanent gradient border with enhanced design
 * - File upload button (UI only)
 * - Send/Abort functionality with real-time status sync
 * - Improved multi-line support
 * - Periodic status checking to ensure UI matches agent state
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  isDisabled = false,
  onReconnect,
  connectionStatus,
}) => {
  const [input, setInput] = useState('');
  const [isAborting, setIsAborting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isProcessing, abortQuery, activeSessionId, checkSessionStatus } =
    useSession();

  // 确保正确处理processing状态
  useEffect(() => {
    if (activeSessionId && connectionStatus?.connected) {
      // 初始检查会话状态
      checkSessionStatus(activeSessionId);

      // 如果会话状态发生变化，增加轮询
      const intervalId = setInterval(() => {
        checkSessionStatus(activeSessionId);
      }, 2000); // 每2秒检查一次状态

      return () => clearInterval(intervalId);
    }
  }, [activeSessionId, connectionStatus?.connected, checkSessionStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isDisabled) return;

    // 立即清空输入框，不等待消息发送完成
    const messageToSend = input.trim();
    setInput('');

    // Reset textarea height immediately
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      // 使用之前保存的消息内容发送
      await sendMessage(messageToSend);
    } catch (error) {
      console.error('Failed to send message:', error);
      // 如果出错，可以选择是否要恢复消息到输入框
      // setInput(messageToSend);
    }
  };

  // Modified to not trigger send on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter as optional shortcut to send
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAbort = async () => {
    if (!isProcessing) return;

    setIsAborting(true);
    try {
      await abortQuery();
    } catch (error) {
      console.error('Failed to abort:', error);
    } finally {
      setIsAborting(false);
    }
  };

  // Adjust textarea height based on content
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInput(target.value);

    // Reset height to recalculate proper scrollHeight
    target.style.height = 'auto';
    // Set to scrollHeight but max 200px
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  // Auto-focus input when available
  useEffect(() => {
    if (!isDisabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDisabled]);

  // Dummy handler for file upload button
  const handleFileUpload = () => {
    console.log('File upload clicked - functionality to be implemented');
  };

  // For debugging
  useEffect(() => {
    if (isProcessing) {
      console.log('MessageInput: Agent is processing');
    } else {
      console.log('MessageInput: Agent is idle');
    }
  }, [isProcessing]);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={`pt-5 pb-10 pl-5 pr-5 relative rounded-2xl overflow-hidden shadow-md dark:shadow-gray-900/30 transition-all duration-300 ${
          isFocused ? 'shadow-lg' : ''
        }`}
      >
        {/* Permanent gradient border effect - always visible */}
        <div
          className="absolute inset-0 rounded-2xl p-[2px] transition-opacity duration-300"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b)',
            opacity: isFocused ? 1 : 0.85,
            zIndex: 0,
          }}
        />

        {/* Actual background (sits on top of gradient) */}
        <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm" />

        {/* File upload button area */}
        <div className="absolute left-3 bottom-2 z-20 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleFileUpload}
            disabled={isDisabled || isProcessing}
            className={`p-2 rounded-full transition-colors ${
              isDisabled || isProcessing
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50/70 dark:hover:bg-primary-900/20'
            }`}
            title="Attach file"
          >
            <FiPaperclip size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleFileUpload}
            disabled={isDisabled || isProcessing}
            className={`p-2 rounded-full transition-colors ${
              isDisabled || isProcessing
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50/70 dark:hover:bg-primary-900/20'
            }`}
            title="Upload image"
          >
            <FiImage size={18} />
          </motion.button>
        </div>

        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            connectionStatus && !connectionStatus.connected
              ? 'Server disconnected...'
              : isProcessing
                ? 'Agent is thinking...'
                : 'Ask TARS something... (Ctrl+Enter to send)'
          }
          disabled={isDisabled}
          className={`w-full focus:outline-none resize-none min-h-[100px] max-h-[200px] bg-transparent text-sm leading-relaxed relative z-10 ${
            connectionStatus && !connectionStatus.connected ? 'opacity-70' : ''
          }`}
          rows={2}
        />

        <AnimatePresence mode="wait">
          {connectionStatus && !connectionStatus.connected ? (
            <motion.button
              key="reconnect"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              type="button"
              onClick={onReconnect}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-yellow-600 hover:bg-yellow-50/70 dark:hover:bg-yellow-900/20 dark:text-yellow-400 transition-all duration-200 z-20"
              title="Try to reconnect"
            >
              <FiRefreshCw
                size={20}
                className={connectionStatus.reconnecting ? 'animate-spin' : ''}
              />
            </motion.button>
          ) : isProcessing ? (
            <motion.button
              key="abort"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              type="button"
              onClick={handleAbort}
              disabled={isAborting}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full z-20 ${
                isAborting
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100/70 dark:hover:bg-gray-700/20 dark:text-gray-400'
              } transition-all duration-200`}
              title="Abort current operation"
            >
              {isAborting ? <FiLoader className="animate-spin" size={20} /> : <FiX size={20} />}
            </motion.button>
          ) : (
            <motion.button
              key="send"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05, rotate: 5 }}
              type="submit"
              disabled={!input.trim() || isDisabled}
              className={`absolute right-5 bottom-5 -translate-y-1/2 p-3 rounded-full z-20 ${
                !input.trim() || isDisabled
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md'
              } transition-all duration-200`}
            >
              <FiSend size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-center mt-2 text-xs">
        {connectionStatus && !connectionStatus.connected ? (
          <motion.span
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            className="text-yellow-600 dark:text-yellow-400"
          >
            {connectionStatus.reconnecting
              ? 'Attempting to reconnect...'
              : 'Server disconnected. Click the button to reconnect.'}
          </motion.span>
        ) : isProcessing ? (
          <motion.span
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            className="text-primary-500 dark:text-primary-400 flex items-center"
          >
            <span className="typing-indicator mr-2">
              <span></span>
              <span></span>
              <span></span>
            </span>
            Agent is processing your request...
          </motion.span>
        ) : (
          <motion.span
            initial={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
            className="text-gray-500 dark:text-gray-400 transition-opacity"
          >
            Type / to access commands • Use Ctrl+Enter to quickly send
          </motion.span>
        )}
      </div>
    </form>
  );
};
