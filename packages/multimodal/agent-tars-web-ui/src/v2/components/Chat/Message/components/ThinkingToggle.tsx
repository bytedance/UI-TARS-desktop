import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCode } from 'react-icons/fi';
import { ToggleButton } from './ToggleButton';

interface ThinkingToggleProps {
  thinking: string;
  showThinking: boolean;
  setShowThinking: (show: boolean) => void;
}

/**
 * Component for showing/hiding the agent's reasoning process
 * 
 * Design principles:
 * - Collapsible content to reduce visual noise
 * - Clear visual distinction for thinking process
 * - Smooth animations for state transitions
 */
export const ThinkingToggle: React.FC<ThinkingToggleProps> = ({
  thinking,
  showThinking,
  setShowThinking,
}) => (
  <div className="mt-3">
    <ToggleButton
      isExpanded={showThinking}
      onToggle={() => setShowThinking(!showThinking)}
      expandedText="Hide reasoning"
      collapsedText="Show reasoning"
      icon={<FiCode className="mr-1.5" />}
    />

    <AnimatePresence>
      {showThinking && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="mt-2 p-3 bg-gray-50/80 dark:bg-gray-700/40 rounded-xl text-xs font-mono overflow-x-auto border border-gray-100/40 dark:border-gray-600/20">
            {thinking}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
