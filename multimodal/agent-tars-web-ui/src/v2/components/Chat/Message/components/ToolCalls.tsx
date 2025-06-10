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
            <FiLoader size={10} className="text-blue-500 dark:text-blue-400" />
          </motion.div>
        );
      case 'success':
        return <FiCheck size={10} className="text-green-500 dark:text-green-400" />;
      case 'error':
        return <FiX size={10} className="text-red-500 dark:text-red-400" />;
      default:
        return <FiClock size={10} className="text-gray-400 dark:text-gray-500" />;
    }
  };

  // Helper function to get status color classes
  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-blue-200/40 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-900/10';
      case 'success':
        return 'border-green-200/40 dark:border-green-800/30 bg-green-50/30 dark:bg-green-900/10';
      case 'error':
        return 'border-red-200/40 dark:border-red-800/30 bg-red-50/30 dark:bg-red-900/10';
      default:
        return 'border-[#E5E6EC] dark:border-gray-700/30 bg-white dark:bg-gray-800';
    }
  };

  return (
    <div className="mt-2 space-y-1.5">
      {toolCalls.map((toolCall) => {
        const status = getToolCallStatus(toolCall);
        const statusColorClasses = getStatusColorClasses(status);

        return (
          <motion.button
            key={toolCall.id}
            onClick={() => onToolCallClick(toolCall)}
            className={`flex items-center gap-2 px-2 py-1 text-[10px] font-medium rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60 text-left group w-full ${statusColorClasses}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tool icon */}
            <div className="flex-shrink-0">
              {getToolIcon(toolCall.function.name)}
            </div>

            {/* Tool name */}
            <div className="truncate flex-1">{toolCall.function.name}</div>

            {/* Status and arrow */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Status icon */}
              <div className="flex items-center justify-center">
                {getStatusIcon(status)}
              </div>

              {/* Arrow - only show if completed */}
              {status !== 'pending' && (
                <FiArrowRight
                  className="opacity-60 group-hover:opacity-100 transition-opacity duration-200"
                  size={10}
                />
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};
