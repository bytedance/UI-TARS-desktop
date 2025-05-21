import React, { useState, useRef } from 'react';
import { useSession } from '../contexts/SessionContext';
import { FiSend } from 'react-icons/fi';

interface MessageInputProps {
  isDisabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ isDisabled = false }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useSession();

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

  // Adjust textarea height based on content
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInput(target.value);

    // Reset height to calculate proper scrollHeight
    target.style.height = 'auto';
    // Set to scrollHeight to expand
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={inputRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        disabled={isDisabled}
        className="w-full border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none min-h-[45px] max-h-[180px] bg-white dark:bg-gray-800 text-sm"
        rows={1}
      />
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
    </form>
  );
};
