import React from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiClock } from 'react-icons/fi';

interface LLMMetricDisplayProps {
  ttftMs?: number;
  ttltMs?: number;
  className?: string;
}

/**
 * LLM (Large Language Model) Metric Display Component
 */
export const LLMMetricDisplay: React.FC<LLMMetricDisplayProps> = ({
  ttftMs,
  ttltMs,
  className = '',
}) => {
  const actualTtftMs = ttftMs;
  const actualTotalMs = ttltMs;

  // Early return if no timing data available
  if (actualTtftMs === undefined) {
    return null;
  }
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
  // Optimized for footer integration with subtle colors
  const getTimingBadgeStyle = (ms: number) => {
    if (ms < 1000) {
      // Very fast - subtle green
      return {
        bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200/30 dark:border-emerald-700/20',
        icon: 'text-emerald-500 dark:text-emerald-400',
      };
    } else if (ms < 3000) {
      // Fast - subtle blue
      return {
        bg: 'bg-blue-50/50 dark:bg-blue-900/10',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200/30 dark:border-blue-700/20',
        icon: 'text-blue-500 dark:text-blue-400',
      };
    } else if (ms < 8000) {
      // Medium - subtle amber
      return {
        bg: 'bg-amber-50/50 dark:bg-amber-900/10',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200/30 dark:border-amber-700/20',
        icon: 'text-amber-500 dark:text-amber-400',
      };
    } else {
      // Slow - subtle red
      return {
        bg: 'bg-red-50/50 dark:bg-red-900/10',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-200/30 dark:border-red-700/20',
        icon: 'text-red-500 dark:text-red-400',
      };
    }
  };

  const timingStyle = getTimingBadgeStyle(actualTtftMs);

  const showDetailedTiming = actualTotalMs && actualTotalMs !== actualTtftMs;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${timingStyle.bg} ${timingStyle.border} ${className}`}
      title={
        showDetailedTiming
          ? `TTFT: ${formatElapsedTime(actualTtftMs)} | Total: ${formatElapsedTime(actualTotalMs)}`
          : `TTFT: ${formatElapsedTime(actualTtftMs)}`
      }
    >
      <FiZap className={`${timingStyle.icon}`} size={10} />
      <span className={`font-mono font-medium whitespace-nowrap ${timingStyle.text}`}>
        {formatElapsedTime(actualTtftMs)}
        {showDetailedTiming && (
          <span className="opacity-60 ml-1">/ {formatElapsedTime(actualTotalMs)}</span>
        )}
      </span>
    </motion.div>
  );
};
