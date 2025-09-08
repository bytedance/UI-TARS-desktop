import React from 'react';
import { FiLoader, FiCheck, FiX, FiClock, FiAlertCircle, FiEdit3 } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ActionButton } from './ActionButton';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';

interface ToolCallsProps {
  toolCalls: any[];
  onToolCallClick: (toolCall: any) => void;
  getToolIcon: (name: string) => React.ReactNode;
  isIntermediate?: boolean;
  toolResults?: any[]; // Add toolResults to check completion status
}

/**
 * Component for displaying tool calls with enhanced icons and loading states
 *
 * Design principles:
 * - Distinct visual identity for different tool types
 * - Shows loading state for pending tool calls
 * - Shows constructing state for streaming tool calls
 * - Displays success/error status with appropriate icons
 * - Provides clear visual feedback with enhanced tool-specific colors
 * - Privacy-protected path display in tool descriptions
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
    // Check if tool call is still being constructed (has incomplete JSON arguments)
    if (toolCall.function?.arguments) {
      try {
        JSON.parse(toolCall.function.arguments);
      } catch (error) {
        // Arguments are incomplete, still constructing
        return 'pending';
      }
    }

    const result = toolResults.find((result) => result.toolCallId === toolCall.id);

    if (!result) {
      return 'pending'; // No result yet, tool is still running
    }

    if (result.error) {
      return 'error'; // Tool execution failed
    }

    return 'success'; // Tool completed successfully
  };

  // Helper function to get elapsed time for a tool call
  const getToolCallElapsedTime = (toolCall: any): number | undefined => {
    const result = toolResults.find((result) => result.toolCallId === toolCall.id);
    return result?.elapsedMs;
  };

  // Helper function to get status icon with enhanced visual styling
  const getStatusIcon = (status: string, toolName: string) => {
    switch (status) {
      case 'constructing':
        return (
          <motion.div
            animate={{
              x: [0, 2, -1, 1, 0],
              y: [0, -1, 1, -0.5, 0],
              rotate: [0, -5, 3, -2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.2, 0.5, 0.8, 1],
            }}
          >
            <FiEdit3 size={16} className="text-blue-600 dark:text-blue-400" />
          </motion.div>
        );
      case 'pending':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <FiLoader size={16} className="text-slate-500 dark:text-slate-400" />
          </motion.div>
        );
      case 'success':
        return <FiCheck size={16} className="text-green-600 dark:text-green-400" />;
      case 'error':
        return <FiAlertCircle size={16} className="text-red-600 dark:text-red-400" />;
      default:
        return <FiClock size={16} className="text-slate-500 dark:text-slate-400" />;
    }
  };

  // Generate tool description text - enhanced readability with path normalization
  const getToolDescription = (toolCall: any, status: string) => {
    try {
      const args =
        typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments || '{}')
          : toolCall.function.arguments;

      switch (toolCall.function.name) {
        case 'Search':
        case 'web_search':
          return args.query
            ? `"${args.query}"`
            : status === 'constructing'
              ? 'preparing query...'
              : '';
        case 'execute_bash':
          return args.command || (status === 'constructing' ? 'preparing...' : '');
        case 'str_replace_editor':
          return args.command && args.path
            ? args.command + ' ' + args.path
            : status === 'constructing'
              ? 'preparing...'
              : '';
        case 'LinkReader':
          return args.url || (status === 'constructing' ? 'preparing...' : '');
        case 'browser_navigate':
          return args.url || (status === 'constructing' ? 'preparing navigation...' : '');
        case 'browser_vision_control':
        case 'browser_control':
          return args.action
            ? `${args.action}`
            : status === 'constructing'
              ? 'preparing action...'
              : '';
        case 'browser_click':
          return args.selector || args.text
            ? `click: ${args.selector || args.text}`
            : status === 'constructing'
              ? 'preparing click...'
              : 'click';
        case 'list_directory':
          return args.path
            ? `path: ${normalizeFilePath(args.path)}`
            : status === 'constructing'
              ? 'preparing path...'
              : '';
        case 'run_command':
          return args.command || (status === 'constructing' ? 'preparing command...' : '');
        case 'read_file':
        case 'write_file':
        case 'edit_file':
          if (args.path) {
            const normalizedPath = normalizeFilePath(args.path);
            return normalizedPath;
          }
          return status === 'constructing' ? 'preparing file operation...' : '';
        default:
          return status === 'constructing' ? 'preparing...' : '';
      }
    } catch (error) {
      console.log(toolCall.function, error);
      // For constructing state, show partial arguments if available
      if (status === 'constructing' && toolCall.function.arguments) {
        return 'constructing parameters...';
      }
      return '';
    }
  };

  // Get browser operation result info
  const getResultInfo = (toolCall: any, status: string) => {
    const result = toolResults.find((result) => result.toolCallId === toolCall.id);

    if (status === 'error' && result?.error) {
      return '"operation failed"';
    } else if (status === 'success') {
      if (toolCall.function.name === 'browser_get_markdown') {
        return '"content retrieved"';
      } else if (toolCall.function.name === 'browser_navigate') {
        return '"navigation success"';
      } else if (toolCall.function.name === 'browser_click') {
        return '"click successful"';
      } else if (toolCall.function.name.startsWith('run_')) {
        return '"command executed"';
      } else if (toolCall.function.name.startsWith('list_')) {
        return '"files listed"';
      } else if (toolCall.function.name.startsWith('read_')) {
        return '"file read"';
      } else if (toolCall.function.name.startsWith('write_')) {
        return '"file saved"';
      } else if (toolCall.function.name === 'edit_file') {
        return '"file edited"';
      }
    }

    return '';
  };

  // Get formatted tool display name for better readability
  const getToolDisplayName = (toolName: string) => {
    // Replace underscores with spaces
    const nameWithSpaces = toolName.replace(/_/g, ' ');

    // Special case handling
    switch (toolName) {
      case 'browser_navigate':
        return 'Navigate';
      case 'browser_vision_control':
        return 'Browser';
      case 'browser_get_markdown':
        return 'Extract Content';
      case 'browser_click':
        return 'Click Element';
      case 'web_search':
        return 'Web Search';
      case 'list_directory':
        return 'List Files';
      case 'run_command':
        return 'Run Command';
      case 'read_file':
        return 'Read File';
      case 'write_file':
        return 'Write File';
      case 'edit_file':
        return 'Edit File';
      default:
        // Title case
        return nameWithSpaces
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  };

  // Helper function to determine if a tool is file-related
  const isFileRelatedTool = (toolName: string) => {
    const fileTools = [
      'read_file',
      'write_file',
      'edit_file',
      'list_directory',
      'str_replace_editor',
    ];
    return fileTools.includes(toolName);
  };

  return (
    <div className="mt-2 space-y-1.5">
      {toolCalls.map((toolCall) => {
        const status = getToolCallStatus(toolCall) as
          | 'constructing'
          | 'pending'
          | 'success'
          | 'error';
        const description = getToolDescription(toolCall, status);
        const browserInfo = getResultInfo(toolCall, status);
        const displayName = getToolDisplayName(toolCall.function.name);
        const elapsedMs = getToolCallElapsedTime(toolCall);

        return (
          <ActionButton
            key={toolCall.id}
            icon={getToolIcon(toolCall.function.name)}
            label={displayName}
            onClick={() => onToolCallClick(toolCall)}
            status={status === 'constructing' ? 'pending' : status}
            statusIcon={getStatusIcon(status, toolCall.function.name)}
            description={description || browserInfo || undefined}
            elapsedMs={elapsedMs} // Pass elapsed time to ActionButton
            isFileRelated={isFileRelatedTool(toolCall.function.name)}
          />
        );
      })}
    </div>
  );
};
