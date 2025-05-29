import React from 'react';
import { toolCallResultMap } from '../state/atoms/tool';
import { ToolResult } from '../types';
import { TOOL_TYPES } from '../constants';
import { 
  FiSearch, 
  FiMonitor, 
  FiTerminal, 
  FiFile, 
  FiImage,
  FiCpu,
  FiBookOpen
} from 'react-icons/fi';

/**
 * Hook for tool-related functionality
 */
export function useTool() {
  /**
   * Get a tool result by its tool call ID
   */
  const getToolResultForCall = (toolCallId: string): ToolResult | undefined => {
    return toolCallResultMap.get(toolCallId);
  };

  /**
   * Get the appropriate icon for a tool type with enhanced styling
   */
  const getToolIcon = (type: string) => {
    // 特殊处理 final_answer 工具，使用更友好的图标和名称
    if (type === 'final_answer') {
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-400 to-accent-500 rounded-full opacity-20"></div>
          <FiBookOpen className="relative z-10 text-accent-600 dark:text-accent-400" />
        </div>
      );
    }
    
    switch (type) {
      case TOOL_TYPES.SEARCH:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full opacity-20"></div>
            <FiSearch className="relative z-10 text-blue-600 dark:text-blue-400" />
          </div>
        );
      case TOOL_TYPES.BROWSER:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-20"></div>
            <FiMonitor className="relative z-10 text-purple-600 dark:text-purple-400" />
          </div>
        );
      case TOOL_TYPES.COMMAND:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full opacity-20"></div>
            <FiTerminal className="relative z-10 text-green-600 dark:text-green-400" />
          </div>
        );
      case TOOL_TYPES.FILE:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full opacity-20"></div>
            <FiFile className="relative z-10 text-yellow-600 dark:text-yellow-400" />
          </div>
        );
      case TOOL_TYPES.IMAGE:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-rose-500 rounded-full opacity-20"></div>
            <FiImage className="relative z-10 text-red-600 dark:text-red-400" />
          </div>
        );
      case TOOL_TYPES.BROWSER_CONTROL:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full opacity-20"></div>
            <FiCpu className="relative z-10 text-cyan-600 dark:text-cyan-400" />
          </div>
        );
      default:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full opacity-20"></div>
            <FiFile className="relative z-10 text-gray-600 dark:text-gray-400" />
          </div>
        );
    }
  };

  return {
    getToolResultForCall,
    getToolIcon,
  };
}
