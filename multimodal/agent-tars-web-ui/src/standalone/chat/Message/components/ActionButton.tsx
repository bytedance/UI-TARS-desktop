import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiClock } from 'react-icons/fi';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  status?: 'default' | 'pending' | 'success' | 'error';
  statusIcon?: React.ReactNode;
  description?: string;
  elapsedMs?: number; // Add elapsed time prop
}

/**
 * ActionButton - Enhanced with timing information display and improved text truncation
 *
 * Design principles:
 * - Responsive layout that adapts to content width
 * - Smart text truncation that preserves timing information
 * - Clear visual hierarchy with proper space allocation
 * - No hardcoded text lengths - pure CSS solution
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  status = 'default',
  statusIcon,
  description,
  elapsedMs,
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
      {/* Icon container with enhanced visual styling */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{icon}</div>

      {/* Main content area with improved responsive layout */}
      <div className="flex-1 min-w-0 flex items-center">
        {/* Text content area - uses flex-1 and min-w-0 for proper truncation */}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-1">
          {/* Tool name */}
          <span className="font-medium">{label}</span>

          {/* Description with responsive truncation */}
          {description && (
            <span className="font-[400] text-xs opacity-70 truncate block sm:inline">
              {description}
            </span>
          )}
        </div>

        {/* Timing information - fixed width to prevent layout shift */}
        {elapsedMs !== undefined && status !== 'pending' && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0 min-w-[3rem]">
            <FiClock className="opacity-60 text-slate-400 dark:text-slate-500" size={12} />
            <span className="text-[10px] opacity-70 font-mono whitespace-nowrap">
              {formatElapsedTime(elapsedMs)}
            </span>
          </div>
        )}
      </div>

      {/* Status icon or arrow - always visible */}
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
