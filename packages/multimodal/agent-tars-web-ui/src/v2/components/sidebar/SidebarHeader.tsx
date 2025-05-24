import React from 'react';
import { motion } from 'framer-motion';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * 侧边栏头部组件
 * 显示应用标题和折叠按钮
 */
export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ isCollapsed, onToggleCollapse }) => {
  return (
    <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/20">
      {!isCollapsed ? (
        <h1 className="text-lg font-display font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-500 dark:to-purple-600 flex items-center justify-center text-white font-bold mr-2 text-xs shadow-sm">
            A
          </span>
          Agent TARS
        </h1>
      ) : (
        <div className="w-full flex justify-center">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-500 dark:to-purple-600 flex items-center justify-center text-white font-bold shadow-sm"
          >
            A
          </motion.div>
        </div>
      )}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleCollapse}
        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
      >
        {isCollapsed ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        )}
      </motion.button>
    </div>
  );
};
