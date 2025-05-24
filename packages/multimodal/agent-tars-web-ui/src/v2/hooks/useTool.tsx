import { toolCallResultMap } from '../state/atoms/tool';
import { ToolResult } from '../types';
import { TOOL_TYPES } from '../constants';
import { FiSearch, FiMonitor, FiTerminal, FiFile, FiImage } from 'react-icons/fi';

/**
 * Hook for tool-related functionality
 *
 * Provides:
 * - Tool result retrieval
 * - Tool icon mapping
 */
export function useTool() {
  /**
   * Get a tool result by its tool call ID
   */
  const getToolResultForCall = (toolCallId: string): ToolResult | undefined => {
    return toolCallResultMap.get(toolCallId);
  };

  /**
   * Get the appropriate icon for a tool type
   */
  const getToolIcon = (type: string) => {
    switch (type) {
      case TOOL_TYPES.SEARCH:
        return <FiSearch />;
      case TOOL_TYPES.BROWSER:
        return <FiMonitor />;
      case TOOL_TYPES.COMMAND:
        return <FiTerminal />;
      case TOOL_TYPES.FILE:
        return <FiFile />;
      case TOOL_TYPES.IMAGE:
        return <FiImage />;
      default:
        return <FiFile />;
    }
  };

  return {
    getToolResultForCall,
    getToolIcon,
  };
}
