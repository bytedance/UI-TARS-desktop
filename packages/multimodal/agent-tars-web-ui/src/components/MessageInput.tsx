import React, { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../store';
import { FiSend, FiX, FiImage, FiPaperclip } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageInputProps {
  isDisabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ isDisabled = false }) => {
  const [input, setInput] = useState('');
  const [isAborting, setIsAborting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isProcessing, abortCurrentQuery } = useSessionStore();

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
      await abortCurrentQuery();
    } catch (error) {
      console.error('Failed to abort:', error);
    } finally {
      setIsAborting(false);
    }
  };

  // 根据内容调整textarea高度
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInput(target.value);

    // 重置高度以计算合适的scrollHeight
    target.style.height = 'auto';
    // 设置为scrollHeight以扩展
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  // Automatically focus input when available
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
            ? 'border-primary-400 dark:border-primary-500 ring-1 ring-primary-400/20 dark:ring-primary-500/20'
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
                  : 'text-red-500 hover:bg-red-50/70 dark:hover:bg-red-900/20'
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
                  : 'text-primary-500 hover:bg-primary-50/70 dark:hover:bg-primary-900/20'
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
