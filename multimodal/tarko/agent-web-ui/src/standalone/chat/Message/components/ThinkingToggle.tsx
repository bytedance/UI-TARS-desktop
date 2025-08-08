import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface ThinkingToggleProps {
  thinking: string;
  showThinking: boolean;
  setShowThinking: (show: boolean) => void;
  duration?: number; // Add optional duration prop
}

/**
 * Component for showing/hiding the agent's reasoning process
 *
 * Design principles:
 * - Clean, readable text format without code block styling
 * - Proper typography with readable font size
 * - Smooth animations for state transitions
 * - Gray text for secondary information hierarchy
 */
export const ThinkingToggle: React.FC<ThinkingToggleProps> = ({
  thinking,
  showThinking,
  setShowThinking,
  duration,
}) => {
  // Format duration display
  const formatDuration = (ms?: number) => {
    if (!ms) return '';

    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  };

  return (
    <div className="mb-3">
      {/* Toggle header */}
      <motion.button
        onClick={() => setShowThinking(!showThinking)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors group"
        whileHover={{ x: 2 }}
      >
        <motion.div animate={{ rotate: showThinking ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronRight size={14} />
        </motion.div>
        <span className="font-medium">
          Thought{duration ? ` for ${formatDuration(duration)}` : ''}
        </span>
      </motion.button>

      {/* Thinking content */}
      <AnimatePresence>
        {showThinking && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 ml-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              <div className="whitespace-pre-wrap">{thinking}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
