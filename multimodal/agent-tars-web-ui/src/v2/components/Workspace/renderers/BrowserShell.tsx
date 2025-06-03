import React from 'react';
import { motion } from 'framer-motion';
import {
  FiRefreshCw,
  FiArrowLeft,
  FiArrowRight,
  FiHome,
  FiLock,
  FiX,
  FiPlus,
} from 'react-icons/fi';

interface BrowserShellProps {
  children: React.ReactNode;
  title?: string;
  url?: string;
  className?: string;
}

/**
 * BrowserShell - A component that mimics a browser window with improved visuals
 *
 * Design improvements:
 * - Modern browser chrome styling with authentic address bar
 * - Refined control buttons with hover effects
 * - Subtle shadows and borders for enhanced depth perception
 * - Realistic URL formatting with https indicator
 * - Tab-like interface for better visual fidelity
 */
export const BrowserShell: React.FC<BrowserShellProps> = ({
  children,
  title = 'Browser',
  url = '',
  className = '',
}) => {
  // Format URL for display
  const displayUrl = url || 'about:blank';
  const isSecure = displayUrl.startsWith('https://');

  // Extract domain for tab display
  const getDomain = (url: string) => {
    try {
      if (url.startsWith('http')) {
        const domain = new URL(url).hostname;
        return domain || title;
      }
    } catch (e) {}
    return title;
  };

  const domain = getDomain(displayUrl);

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/30 shadow-sm ${className}`}
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Browser toolbar with improved design */}
      <div className="bg-gray-100 dark:bg-gray-800/90 border-b border-gray-200/80 dark:border-gray-700/40">
        {/* Browser tabs bar */}
        {/* <div className="flex items-center px-3 pt-2 pb-0 border-b border-transparent">
          <div className="flex-1 flex items-center">
            <div className="flex items-center mr-1 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-t-lg border-t border-l border-r border-gray-200/80 dark:border-gray-700/40 text-xs font-medium relative">
              <span className="max-w-[120px] truncate">{domain}</span>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500 dark:bg-accent-400"></div>
            </div>
            <div className="w-7 h-7 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-full cursor-pointer transition-colors">
              <FiPlus size={14} />
            </div>
          </div>
        </div> */}

        {/* Address bar with controls */}
        <div className="flex items-center px-3 py-2">
          {/* Control buttons with enhanced styling */}
          <div className="flex space-x-1.5 mr-3">
            <div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-400 border border-red-600/20 dark:border-red-500/20" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 dark:bg-yellow-400 border border-yellow-600/20 dark:border-yellow-500/20" />
            <div className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-400 border border-green-600/20 dark:border-green-500/20" />
          </div>

          {/* Navigation buttons */}
          {/* <div className="flex space-x-1 mr-3 text-gray-500 dark:text-gray-400">
            <button className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-full transition-colors">
              <FiArrowLeft size={14} />
            </button>
            <button className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-full transition-colors">
              <FiArrowRight size={14} />
            </button>
            <button className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-full transition-colors">
              <FiRefreshCw size={14} />
            </button>
            <button className="p-1 hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-full transition-colors">
              <FiHome size={14} />
            </button>
          </div> */}

          {/* URL bar with secure indicator */}
          <div className="flex-1 bg-gray-200/90 dark:bg-gray-700/70 rounded-md flex items-center px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 border border-gray-300/20 dark:border-gray-600/30 group hover:border-gray-400/30 dark:hover:border-gray-500/30 transition-colors">
            {isSecure && <FiLock className="mr-1.5 text-green-600 dark:text-green-400" size={12} />}
            <span className="truncate font-mono">{displayUrl}</span>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="overflow-auto max-h-[70vh]">{children}</div>
    </motion.div>
  );
};
