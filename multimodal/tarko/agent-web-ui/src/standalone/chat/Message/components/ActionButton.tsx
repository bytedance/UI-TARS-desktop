import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiClock, FiZap } from 'react-icons/fi';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  status?: 'default' | 'pending' | 'success' | 'error';
  statusIcon?: React.ReactNode;
  description?: string;
  elapsedMs?: number;
  isFileRelated?: boolean;
}

/**
 * ActionButton - Enhanced with improved timing display
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  status = 'default',
  statusIcon,
  description,
  elapsedMs,
  isFileRelated = false,
}) => {
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
    } else if (ms < 5000) {
      // Fast - blue
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200/50 dark:border-blue-700/30',
        icon: 'text-blue-600 dark:text-blue-400',
      };
    } else if (ms < 15000) {
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

  // Helper function to get status color classes
  const getStatusColorClasses = () => {
    switch (status) {
      case 'pending':
        return 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
      case 'success':
        return 'border-slate-200 dark:border-slate-600 bg-[#f9fafb] dark:bg-slate-800/60 text-slate-800 dark:text-slate-200';
      case 'error':
        return 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      default:
        return 'border-slate-200 dark:border-slate-600 bg-[#f9fafb] dark:bg-slate-800/60 text-slate-800 dark:text-slate-200';
    }
  };

  // Helper function to get hover effect classes
  const getHoverColorClasses = () => {
    switch (status) {
      case 'pending':
        return 'hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500';
      case 'success':
        return 'hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500';
      case 'error':
        return 'hover:bg-red-100 dark:hover:bg-red-800/30 hover:border-red-300 dark:hover:border-red-600';
      default:
        return 'hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500';
    }
  };

  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl hover:scale-[1.01] active:scale-[0.99] border text-left group w-full ${getStatusColorClasses()} ${getHoverColorClasses()}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Icon container */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{icon}</div>

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex items-center">
        {/* Text content area */}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-1">
          {/* Tool name */}

          <span className="font-medium whitespace-nowrap">{label}</span>

          {/* Description */}
          {description && (
            <span
              className={`font-[400] text-xs opacity-70 block sm:inline overflow-hidden whitespace-nowrap text-ellipsis ${isFileRelated ? '[direction:rtl] [text-align:left]' : ''}`}
            >
              {description}
            </span>
          )}
        </div>

        {/* Enhanced timing badge */}
        {elapsedMs !== undefined && status !== 'pending' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className={`flex items-center gap-1 ml-2 px-2 py-1 rounded-full border ${getTimingBadgeStyle(elapsedMs).bg} ${getTimingBadgeStyle(elapsedMs).border} flex-shrink-0`}
          >
            <FiZap className={`${getTimingBadgeStyle(elapsedMs).icon}`} size={10} />
            <span
              className={`text-[10px] font-mono font-medium whitespace-nowrap ${getTimingBadgeStyle(elapsedMs).text}`}
            >
              {formatElapsedTime(elapsedMs)}
            </span>
          </motion.div>
        )}
      </div>

      {/* Status icon or arrow */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {statusIcon || (
          <FiArrowRight
            className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 text-slate-500 dark:text-slate-400"
            size={16}
          />
        )}
      </div>
    </motion.button>
  );
};
