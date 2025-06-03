import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiMoon, FiSun } from 'react-icons/fi';
import { GoSidebarCollapse, GoSidebarExpand } from 'react-icons/go';
import { useLayout } from '../../hooks/useLayout';
import { useSession } from '../../hooks/useSession';
import { ShareButton } from '../Share';
import { useReplayMode } from '../../context/ReplayModeContext';

import './Navbar.css';

export const Navbar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { activeSessionId, isProcessing, modelInfo } = useSession();
  const isReplayMode = useReplayMode();
  const [isDarkMode, setIsDarkMode] = React.useState(
    document.documentElement.classList.contains('dark'),
  );

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);

    // Save preference to localStorage
    localStorage.setItem('agent-tars-theme', newMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <div className="h-12 border-b border-gray-300/40 dark:border-gray-600/20 backdrop-blur-sm flex items-center px-3">
      {/* Left section with macOS-style traffic lights */}
      <div className="flex items-center">
        {/* macOS-style traffic lights */}
        <div className="flex space-x-1.5 mr-3">
          <div className="traffic-light traffic-light-red" />
          <div className="traffic-light traffic-light-yellow" />
          <div className="traffic-light traffic-light-green" />
        </div>
      </div>

      {/* Sidebar toggle button - positioned at the right edge aligned with Chat area */}
      {!isReplayMode && (
        <div className={`${isSidebarCollapsed ? 'ml-0' : 'ml-[245px]'}`}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 rounded-full transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <GoSidebarCollapse size={20} /> : <GoSidebarExpand size={20} />}
          </motion.button>
        </div>
      )}

      {/* Center section - Model info */}
      <div className="flex-1 flex items-center justify-center">
        {modelInfo.model && (
          <div className="px-3 py-1 rounded-full bg-gray-100/80 dark:bg-gray-700/80 text-xs text-gray-700 dark:text-gray-300 border border-gray-200/40 dark:border-gray-700/30 flex items-center">
            <div className="w-4 h-4 rounded-full bg-purple-400 dark:bg-purple-500 mr-2 flex-shrink-0"></div>
            <span className="font-mono">{modelInfo.model}</span>
            {modelInfo.provider && (
              <span className="ml-2 px-1.5 py-0.5 rounded-md bg-gray-200/80 dark:bg-gray-600/80 text-gray-600 dark:text-gray-400 text-[10px]">
                {modelInfo.provider}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right section - with share button and dark mode toggle */}
      <div className="flex items-center space-x-2">
        {activeSessionId && !isProcessing && <ShareButton variant="navbar" />}

        {/* Dark mode toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleDarkMode}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-colors"
          title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {isDarkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
        </motion.button>
      </div>
    </div>
  );
};
