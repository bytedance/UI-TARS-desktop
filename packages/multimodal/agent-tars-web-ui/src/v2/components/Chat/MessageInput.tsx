import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import { FiSend, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageInputProps {
  isDisabled?: boolean;
}

/**
 * MessageInput Component - Input for sending messages
 *
 * Provides:
 * - Auto-expanding textarea for input
 * - Send/Abort functionality
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Disabled state handling
 */
export const MessageInput: React.FC<MessageInputProps> = ({ isDisabled = false }) => {
  const [input, setInput] = useState('');
  const [isAborting, setIsAborting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isProcessing, abortQuery } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isDisabled) return;

    try {
      await sendMessage(input);
      setInput('');

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={`relative rounded-2xl transition-all duration-300 ${
          isFocused
            ? 'border-gray-400 dark:border-gray-500 ring-1 ring-gray-300/20 dark:ring-gray-600/20'
            : 'border-gray-200/50 dark:border-gray-700/40'
        } border overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm`}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isProcessing ? 'Processing...' : 'Ask TARS something...'}
          disabled={isDisabled}
          className="w-full py-3.5 px-4 pr-12 focus:outline-none resize-none min-h-[45px] max-h-[200px] bg-transparent text-sm leading-relaxed"
          rows={1}
        />

        <AnimatePresence mode="wait">
          {isProcessing ? (
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
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full ${
                isAborting
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100/70 dark:hover:bg-gray-700/20 dark:text-gray-400'
              } transition-all duration-200`}
              title="Abort current operation"
            >
              <FiX size={18} />
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
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full ${
                !input.trim() || isDisabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100/70 dark:hover:bg-gray-700/20 dark:text-gray-400'
              } transition-all duration-200`}
            >
              <FiSend size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-center mt-2 text-xs text-gray-500 dark:text-gray-400">
        <motion.span
          initial={{ opacity: 0.7 }}
          whileHover={{ opacity: 1 }}
          className="transition-opacity"
        >
          Type / to access commands
        </motion.span>
      </div>
    </form>
  );
};
