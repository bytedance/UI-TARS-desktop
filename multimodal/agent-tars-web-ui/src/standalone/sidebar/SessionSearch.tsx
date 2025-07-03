import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface SessionSearchProps {
  onSearch: (query: string) => void;
}

export const SessionSearch: React.FC<SessionSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);
      onSearch(newQuery);
    },
    [onSearch],
  );

  // Clear search query
  const clearSearch = useCallback(() => {
    setQuery('');
    onSearch('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onSearch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+F or Ctrl+F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Escape to clear and blur search when focused
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        clearSearch();
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSearch]);

  return (
    <div className="px-3 py-2 border-b border-gray-100/40 dark:border-gray-700/20">
      <motion.div
        initial={{ opacity: 0.9, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border ${
          isFocused
            ? 'border-accent-300/50 dark:border-accent-500/30 shadow-sm ring-2 ring-accent-100/20 dark:ring-accent-800/10'
            : 'border-gray-300/70 dark:border-gray-600/50'
        }`}
      >
        <FiSearch
          className={`mr-2 ${
            isFocused ? 'text-accent-500 dark:text-accent-400' : 'text-gray-400 dark:text-gray-500'
          }`}
          size={14}
        />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search tasks..."
          className="bg-transparent text-sm w-full outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          aria-label="Search tasks"
        />
        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={clearSearch}
            className="p-1 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-700/80 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            title="Clear search"
          >
            <FiX size={14} />
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};
