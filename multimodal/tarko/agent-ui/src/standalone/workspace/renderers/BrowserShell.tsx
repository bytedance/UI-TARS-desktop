import React from 'react';
import { FiLock, FiGlobe } from 'react-icons/fi';

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
  const displayUrl = url || '';
  const isSecure = displayUrl.startsWith('https://');

  // Extract domain for tab display
  const getDomain = (url: string) => {
    try {
      if (url.startsWith('http')) {
        const domain = new URL(url).hostname;
        return domain || title;
      }
    } catch (e) { }
    return title;
  };

  const domain = getDomain(displayUrl);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200/70 dark:border-gray-700/40 shadow-sm ${className}`}
    >
      {/* Browser toolbar with improved design */}
      <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800/90 dark:to-gray-800 border-b border-gray-200/80 dark:border-gray-700/40 shadow-sm">
        {/* Address bar with controls */}
        <div className="flex items-center p-3">
          {/* Control buttons with enhanced styling */}
          <div className="flex space-x-1.5 mr-3">
            <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500 border border-red-500/20 dark:border-red-400/20 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500 border border-yellow-500/20 dark:border-yellow-400/20 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500 border border-green-500/20 dark:border-green-400/20 shadow-sm" />
          </div>

          {/* URL bar with secure indicator */}
          <div className="flex-1 overflow-hidden bg-white dark:bg-gray-700 rounded-md flex items-center px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 border border-gray-300/30 dark:border-gray-600/40 group hover:border-gray-400/30 dark:hover:border-gray-500/30 transition-colors shadow-inner">
            <div className="flex items-center w-full">
              {isSecure ? (
                <FiLock className="mr-1.5 text-green-500 dark:text-green-400" size={12} />
              ) : (
                <FiGlobe className="mr-1.5 text-gray-400 dark:text-gray-500" size={12} />
              )}
              <span className="truncate flex-1">{displayUrl}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="overflow-auto max-h-[100vh]">{children}</div>
    </div>
  );
};
