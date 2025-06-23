import React from 'react';
import { FiLoader, FiCheck, FiX, FiClock, FiAlertCircle } from 'react-icons/fi';
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
 * Component for displaying tool calls with enhanced icons and loading states
 *
 * Design principles:
 * - Distinct visual identity for different tool types
 * - Shows loading state for pending tool calls
 * - Displays success/error status with appropriate icons
 * - Provides clear visual feedback with enhanced tool-specific colors
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

  // Helper function to get status icon with enhanced visual styling
  const getStatusIcon = (status: string, toolName: string) => {
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
        return <FiCheck size={10} className="text-green-600 dark:text-green-400" />;
      case 'error':
        return <FiAlertCircle size={10} className="text-red-600 dark:text-red-400" />;
      default:
        return <FiClock size={10} className="text-slate-500 dark:text-slate-400" />;
    }
  };

  // 生成工具描述文本 - 增强描述信息的可读性
  const getToolDescription = (toolCall: any) => {
    try {
      const args = JSON.parse(toolCall.function.arguments || '{}');

      switch (toolCall.function.name) {
        case 'web_search':
          return args.query ? `"${args.query}"` : '';
        case 'browser_navigate':
          // 限制 URL 长度以避免溢出
          return args.url;
        case 'browser_vision_control':
        case 'browser_control':
          return args.action ? `${args.action}` : '';
        case 'browser_click':
          return args.selector || args.text ? `click: ${args.selector || args.text}` : 'click';
        case 'list_directory':
          return args.path ? `path: ${args.path}` : '';
        case 'run_command':
          return args.command;

        case 'read_file':
        case 'write_file':
          return args.path ? `file: ${args.path.split('/').pop()}` : '';
        default:
          return '';
      }
    } catch (error) {
      console.error('Failed to parse tool arguments:', error);
      return '';
    }
  };

  // 获取浏览器操作结果说明
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
      }
    }

    return '';
  };

  // 获取工具的格式化名称，使其更易读
  const getToolDisplayName = (toolName: string) => {
    // 替换下划线为空格
    const nameWithSpaces = toolName.replace(/_/g, ' ');

    // 特殊情况处理
    switch (toolName) {
      case 'browser_navigate':
        return 'Navigate';
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
      default:
        // 首字母大写
        return nameWithSpaces
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  };

  return (
    <div className="mt-2 space-y-1.5">
      {toolCalls.map((toolCall) => {
        const status = getToolCallStatus(toolCall) as 'pending' | 'success' | 'error';
        const description = getToolDescription(toolCall);
        const browserInfo = getResultInfo(toolCall, status);
        const displayName = getToolDisplayName(toolCall.function.name);

        return (
          <ActionButton
            key={toolCall.id}
            icon={getToolIcon(toolCall.function.name)}
            label={displayName}
            onClick={() => onToolCallClick(toolCall)}
            status={status}
            statusIcon={getStatusIcon(status, toolCall.function.name)}
            description={description || browserInfo || undefined}
          />
        );
      })}
    </div>
  );
};
