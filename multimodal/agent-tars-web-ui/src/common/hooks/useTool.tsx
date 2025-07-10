import React from 'react';

import {
  FiFileText,
  FiImage,
  FiCode,
  FiSave,
  FiTool,
  FiSearch,
  FiGlobe,
  FiTerminal,
  FiFile,
  FiMousePointer,
  FiLayers,
} from 'react-icons/fi';
import {
  RiSearchLine,
  RiGlobalLine,
  RiFolderLine,
  RiTerminalLine,
  RiNewspaperLine,
  RiScreenshot2Line,
  RiCursorLine,
} from 'react-icons/ri';
import { TOOL_NAMES, TOOL_CATEGORIES, getToolCategory } from '../constants/toolTypes';

/**
 * Custom hook for tool-related functionality
 *
 * Provides tool icons and helpers for working with AI tool calls
 */
export const useTool = () => {
  /**
   * Get the appropriate icon for a tool based on its name
   */

  const getToolIcon = (toolType: string, size: number = 16) => {
    const iconProps = { size };

    switch (toolType) {
      case 'search':
        return <FiSearch {...iconProps} className="text-blue-500 dark:text-blue-400" />;
      case 'browser':
        return <FiGlobe {...iconProps} className="text-purple-500 dark:text-purple-400" />;
      case 'command':
        return <FiTerminal {...iconProps} className="text-green-500 dark:text-green-400" />;
      case 'file':
      case 'read_file':
      case 'write_file':
        return <FiFile {...iconProps} className="text-yellow-500 dark:text-yellow-400" />;
      case 'image':
        return <FiImage {...iconProps} className="text-red-500 dark:text-red-400" />;
      case 'browser_vision_control':
        return <FiMousePointer {...iconProps} className="text-cyan-500 dark:text-cyan-400" />;
      default:
        return <FiLayers {...iconProps} className="text-gray-500 dark:text-gray-400" />;
    }
  };

  return {
    getToolIcon,
  };
};
