import React from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw } from 'react-icons/fi';

interface BrowserShellProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/**
 * BrowserShell - A component that mimics a browser window
 *
 * This component wraps browser content in a UI that resembles a browser window,
 * complete with address bar, tabs, and browser controls.
 *
 * Design principles:
 * - Realistic browser chrome styling with authentic control buttons
 * - Subtle shadows and borders for depth perception
 * - High-contrast UI elements for better visibility
 * - Consistent styling for all browser-rendered content
 */
export const BrowserShell: React.FC<BrowserShellProps> = ({
  children,
  title = 'Browser',
  className = '',
}) => {
  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/30 shadow-sm ${className}`}
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Browser toolbar */}
      <div className="bg-gray-100 dark:bg-gray-800/90 border-b border-gray-200/80 dark:border-gray-700/40">
        {/* Address bar */}
        <div className="flex items-center px-3 py-2">
          {/* Control buttons - enhanced with colors */}
          <div className="flex space-x-1.5 mr-3">
            <div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 dark:bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-400" />
          </div>

          {/* Navigation buttons */}
          <div className="flex space-x-2 mr-3 text-gray-500 dark:text-gray-400">
            <button className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded">
              <FiRefreshCw size={12} />
            </button>
          </div>

          {/* URL bar - enhanced contrast */}
          <div className="flex-1 bg-gray-200/90 dark:bg-gray-700/70 rounded-md flex items-center px-2 py-1 text-xs text-gray-700 dark:text-gray-200 border border-gray-300/20 dark:border-gray-600/30">
            <svg
              className="mr-1 text-gray-500 dark:text-gray-400"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12H22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {title}
          </div>
        </div>
      </div>

      {/* Content area */}
      {children}
    </motion.div>
  );
};
