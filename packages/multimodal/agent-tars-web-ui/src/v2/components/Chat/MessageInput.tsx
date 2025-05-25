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
 * Design principles:
 * - Elegant gradient glow effect on focus for visual delight
 * - Dynamic microinteractions for user feedback
 * - Clean, spacious layout for comfortable typing
 * - Context-aware button states with smooth transitions
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

  // Ensure processing state is handled correctly
  useEffect(() => {
    if (activeSessionId && connectionStatus?.connected) {
      // Initial check of session status
      checkSessionStatus(activeSessionId);

      // If session status changes, increase polling
      const intervalId = setInterval(() => {
        checkSessionStatus(activeSessionId);
      }, 2000); // Check status every 2 seconds

      return () => clearInterval(intervalId);
    }
  }, [activeSessionId, connectionStatus?.connected, checkSessionStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isDisabled) return;

    // Immediately clear input field, don't wait for message to be sent
    const messageToSend = input.trim();
    setInput('');

    // Reset textarea height immediately
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      // Use previously saved message content to send
      await sendMessage(messageToSend);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally restore message to input field on error
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

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={`relative rounded-3xl overflow-hidden transition-all duration-300 ${
          isFocused ? 'shadow-glow' : ''
        }`}
      >
        {/* Modern gradient border effect - visible on focus */}
        <div
          className={`absolute inset-0 rounded-3xl transition-opacity duration-300 ${
            isFocused ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(135deg, #38bdf8, #e879f9)',
            padding: '1.5px',
          }}
        />

        {/* Main input container */}
        <div className="relative rounded-3xl bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm">
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
            className={`w-full px-5 pt-4 pb-10 focus:outline-none resize-none min-h-[90px] max-h-[200px] bg-transparent text-sm leading-relaxed rounded-3xl ${
              connectionStatus && !connectionStatus.connected ? 'opacity-70' : ''
            }`}
            rows={2}
          />

          {/* File upload buttons */}
          <div className="absolute left-3 bottom-2 flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleFileUpload}
              disabled={isDisabled || isProcessing}
              className={`p-2 rounded-full transition-colors ${
                isDisabled || isProcessing
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50/40 dark:hover:bg-primary-900/20'
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
                  : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50/40 dark:hover:bg-primary-900/20'
              }`}
              title="Upload image"
            >
              <FiImage size={18} />
            </motion.button>
          </div>

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
                className="absolute right-3 bottom-2 p-2 rounded-full text-yellow-600 hover:bg-yellow-50/60 dark:hover:bg-yellow-900/10 dark:text-yellow-400 transition-all duration-200"
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
                className={`absolute right-3 bottom-2 p-2 rounded-full ${
                  isAborting
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100/60 dark:hover:bg-gray-700/30 dark:text-gray-400'
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
                whileHover={{ scale: 1.05 }}
                type="submit"
                disabled={!input.trim() || isDisabled}
                className={`absolute right-3 bottom-2 p-3 rounded-full ${
                  !input.trim() || isDisabled
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-sm'
                } transition-all duration-200`}
              >
                <FiSend size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
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
