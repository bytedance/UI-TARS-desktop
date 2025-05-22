import React, { useState, useRef } from 'react';
import { useSessionStore } from '../store';
import { FiSend, FiX } from 'react-icons/fi';

interface MessageInputProps {
  isDisabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ isDisabled = false }) => {
  const [input, setInput] = useState('');
  const [isAborting, setIsAborting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isProcessing, abortCurrentQuery } = useSessionStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isDisabled) return;

    try {
      await sendMessage(input);
      setInput('');
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

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={inputRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={isProcessing ? 'Processing...' : 'Type your message...'}
        disabled={isDisabled}
        className="w-full border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none min-h-[45px] max-h-[180px] bg-white dark:bg-gray-800 text-sm"
        rows={1}
      />

      {isProcessing ? (
        <button
          type="button"
          onClick={handleAbort}
          disabled={isAborting}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
            isAborting
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
          }`}
          title="Abort current operation"
        >
          <FiX size={16} />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!input.trim() || isDisabled}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
            !input.trim() || isDisabled
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700'
          }`}
        >
          <FiSend size={16} />
        </button>
      )}
    </form>
  );
};
