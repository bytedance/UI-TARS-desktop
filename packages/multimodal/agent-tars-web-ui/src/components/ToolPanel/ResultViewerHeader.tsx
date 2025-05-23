import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiChevronRight, FiMaximize2, FiMinimize2, FiClock } from 'react-icons/fi';
import { getToolIcon } from './utils';
import { PanelContent } from '../../store/atoms/sessionAtoms';

interface ResultViewerHeaderProps {
  content: PanelContent;
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
  onToggleCollapse: () => void;
  onBack: () => void;
  showBackButton: boolean;
}

export const ResultViewerHeader: React.FC<ResultViewerHeaderProps> = ({
  content,
  isFullscreen,
  setIsFullscreen,
  onToggleCollapse,
  onBack,
  showBackButton,
}) => {
  return (
    <div className="mb-4 flex items-center gap-2 justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gray-100/80 dark:bg-gray-800/80 flex items-center justify-center border border-gray-200/40 dark:border-gray-700/30">
          {getToolIcon(content.type)}
        </div>
        <span className="font-medium text-gray-800 dark:text-gray-200">{content.title}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(content.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </div>
      <div className="flex items-center">
        {showBackButton && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-700/40 rounded-lg transition-all duration-200"
            title="Show timeline"
          >
            <FiArrowLeft />
          </motion.button>
        )}
        {!isFullscreen && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleCollapse}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-700/40 rounded-lg ml-1 transition-all duration-200"
            title="Collapse panel"
          >
            <FiChevronRight />
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-700/40 rounded-lg ml-1 transition-all duration-200"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
        </motion.button>
      </div>
    </div>
  );
};
