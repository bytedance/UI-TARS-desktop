import React from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiClock } from 'react-icons/fi';

interface TTFTDisplayProps {
  elapsedMs: number;
  className?: string;
}

/**
 * TTFT (Time to First Token) Display Component
 * Shows the response time for assistant messages with appropriate color coding
 */
export const TTFTDisplay: React.FC<TTFTDisplayProps> = ({ elapsedMs, className = '' }) => {
  // Helper function to format elapsed time for display
  const formatElapsedTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  // Helper function to get timing badge style based on duration
  const getTimingBadgeStyle = (ms: number) => {
    if (ms < 1000) {
      // Very fast - green
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200/50 dark:border-emerald-700/30',
        icon: 'text-emerald-600 dark:text-emerald-400',
      };
    } else if (ms < 3000) {
      // Fast - blue
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200/50 dark:border-blue-700/30',
        icon: 'text-blue-600 dark:text-blue-400',
      };
    } else if (ms < 8000) {
      // Medium - amber
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200/50 dark:border-amber-700/30',
        icon: 'text-amber-600 dark:text-amber-400',
      };
    } else {
      // Slow - red
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200/50 dark:border-red-700/30',
        icon: 'text-red-600 dark:text-red-400',
      };
    }
  };

  const timingStyle = getTimingBadgeStyle(elapsedMs);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${timingStyle.bg} ${timingStyle.border} ${className}`}
    >
      <FiZap className={`${timingStyle.icon}`} size={12} />
      <span className={`font-mono font-medium whitespace-nowrap ${timingStyle.text}`}>
        {formatElapsedTime(elapsedMs)}
      </span>
    </motion.div>
  );
};
