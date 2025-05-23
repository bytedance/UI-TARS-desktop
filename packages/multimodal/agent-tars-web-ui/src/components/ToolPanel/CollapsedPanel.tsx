import React from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft } from 'react-icons/fi';
import { ReplayController } from '../ReplayController';

interface CollapsedPanelProps {
  onToggleCollapse: () => void;
  showReplayControls: boolean;
}

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
        <FiChevronLeft />
      </motion.button>

      <ReplayController isVisible={showReplayControls} />
    </div>
  );
};
