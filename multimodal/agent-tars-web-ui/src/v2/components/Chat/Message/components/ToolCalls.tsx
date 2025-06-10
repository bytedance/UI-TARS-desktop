import React from 'react';
import { FiArrowRight, FiLoader, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface ToolCallsProps {
  toolCalls: any[];
  onToolCallClick: (toolCall: any) => void;
  getToolIcon: (name: string) => React.ReactNode;
  isIntermediate?: boolean;
  toolResults?: any[]; // Add toolResults to check completion status
}

/**
 * Component for displaying tool calls with loading states and status icons
 *
 * Design principles:
 * - Shows loading state for pending tool calls
 * - Displays success/error status with appropriate icons
 * - Maintains compact display for thinking sequences
 * - Provides clear visual feedback for tool execution status
 * - Refined colors for better visual harmony while keeping simplicity
 */
export const ToolCalls: React.FC<ToolCallsProps> = ({
  toolCalls,
  onToolCallClick,
  getToolIcon,
  isIntermediate = false,
  toolResults = [],
}) => {
  // Helper function to get tool call status
  const getToolCallStatus = (toolCall: any) => {
    const result = toolResults.find((result) => result.toolCallId === toolCall.id);
    
    if (!result) {
      return 'pending'; // No result yet, tool is still running
    }
    
    if (result.error) {
      return 'error'; // Tool execution failed
    }
    
    return 'success'; // Tool completed successfully
  };

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <FiLoader size={10} className="text-slate-500 dark:text-slate-400" />
          </motion.div>
        );
      case 'success':
        return <FiCheck size={10} className="text-slate-600 dark:text-slate-300" />;
      case 'error':
        return <FiX size={10} className="text-red-600 dark:text-red-400" />;
      default:
        return <FiClock size={10} className="text-slate-500 dark:text-slate-400" />;
    }
  };

  // Helper function to get status color classes with refined, monochromatic palette
  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 shadow-sm';
      case 'success':
        return 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 shadow-sm';
      case 'error':
        return 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-sm';
      default:
        return 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 shadow-sm';
    }
  };

  // Helper function to get hover effect classes
  const getHoverColorClasses = (status: string) => {
    switch (status) {
      case 'pending':
        return 'hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500';
      case 'success':
        return 'hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500';
      case 'error':
        return 'hover:bg-red-100 dark:hover:bg-red-800/30 hover:border-red-300 dark:hover:border-red-600';
      default:
        return 'hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500';
    }
  };

  return (
    <div className="mt-2 space-y-1.5">
      {toolCalls.map((toolCall) => {
        const status = getToolCallStatus(toolCall);
        const statusColorClasses = getStatusColorClasses(status);
        const hoverColorClasses = getHoverColorClasses(status);

        return (
          <motion.button
            key={toolCall.id}
            onClick={() => onToolCallClick(toolCall)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] border text-left group w-full ${statusColorClasses} ${hoverColorClasses}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ 
              y: -1,
              transition: { duration: 0.15 }
            }}
          >
            {/* Tool icon with refined styling */}
            <div className="flex-shrink-0 opacity-80">
              {getToolIcon(toolCall.function.name)}
            </div>

            {/* Tool name with refined typography */}
            <div className="truncate flex-1 font-medium">{toolCall.function.name}</div>

            {/* Status and arrow with refined styling */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Status icon */}
              <div className="flex items-center justify-center">
                {getStatusIcon(status)}
              </div>

              {/* Arrow - only show if completed */}
              {status !== 'pending' && (
                <FiArrowRight
                  className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 text-slate-500 dark:text-slate-400"
                  size={11}
                />
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};
