import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

interface SessionSearchProps {
  onSearch: (query: string) => void;
}

export const SessionSearch: React.FC<SessionSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);
      onSearch(newQuery);
    },
    [onSearch],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    onSearch('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }

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
      <div
        className={`flex items-center px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border transition-all duration-200 animate-in slide-in-from-top-1 fade-in ${
          isFocused
            ? 'border-accent-300/50 dark:border-accent-500/30 shadow-sm ring-2 ring-accent-100/20 dark:ring-accent-800/10'
            : 'border-gray-300/70 dark:border-gray-600/50'
        }`}
      >
        <FiSearch
          className={`mr-2 transition-colors ${
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
          <button
            onClick={clearSearch}
            className="p-1 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-700/80 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all hover:scale-110 active:scale-90 animate-in zoom-in duration-200"
            title="Clear search"
          >
            <FiX size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
