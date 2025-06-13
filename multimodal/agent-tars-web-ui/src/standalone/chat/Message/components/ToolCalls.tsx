import React from 'react';
import { FiLoader, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ActionButton } from './ActionButton';

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

  return (
    <div className="mt-2 space-y-1.5">
      {toolCalls.map((toolCall) => {
        const status = getToolCallStatus(toolCall) as 'pending' | 'success' | 'error';
        
        return (
          <ActionButton
            key={toolCall.id}
            icon={getToolIcon(toolCall.function.name)}
            label={toolCall.function.name}
            onClick={() => onToolCallClick(toolCall)}
            status={status}
            statusIcon={getStatusIcon(status)}
          />
        );
      })}
    </div>
  );
};
