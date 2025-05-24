import React from 'react';
import { motion } from 'framer-motion';

interface CollapsedPanelProps {
  onToggleCollapse: () => void;
  showReplayControls: boolean;
}

/**
 * 折叠面板组件
 * 显示工作区处于折叠状态时的UI
 */
export const CollapsedPanel: React.FC<CollapsedPanelProps> = ({
  onToggleCollapse,
  showReplayControls,
}) => {
  return (
    <div className="h-full flex flex-col justify-between">
      <div className="flex justify-center py-4">
        <span className="writing-vertical-lr text-xs text-gray-500 font-medium uppercase tracking-wider">
          My Workspace
        </span>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggleCollapse}
        className="mt-auto mb-4 flex justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200"
        title="Expand panel"
      >
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
      </motion.button>
    </div>
  );
};
