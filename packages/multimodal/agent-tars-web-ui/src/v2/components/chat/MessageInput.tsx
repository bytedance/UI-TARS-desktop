import React, { useState, useRef, useEffect } from 'react';
import { useAgent } from '../../hooks/useAgent';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageInputProps {
  isDisabled?: boolean;
}

/**
 * 消息输入组件
 * 允许用户输入消息并发送给Agent
 */
export const MessageInput: React.FC<MessageInputProps> = ({ isDisabled = false }) => {
  const [input, setInput] = useState('');
  const [isAborting, setIsAborting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, abortCurrentQuery } = useAgent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isDisabled) return;

    try {
      await sendMessage(input);
      setInput('');

      // 重置文本区域高度
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
    if (isDisabled && !isAborting) return;

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

  // 自动聚焦输入框
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
          placeholder={isDisabled ? 'Processing...' : 'Ask TARS something...'}
          disabled={isDisabled}
          className="w-full py-3.5 px-4 pr-12 focus:outline-none resize-none min-h-[45px] max-h-[200px] bg-transparent text-sm leading-relaxed"
          rows={1}
        />

        <AnimatePresence mode="wait">
          {isDisabled ? (
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
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
