import React from 'react';
import { FiFileText, FiImage, FiCode, FiSave, FiTool } from 'react-icons/fi';
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
  const getToolIcon = (toolName: string): React.ReactNode => {
    // Handle known tool names first
    switch (toolName) {
      // Web tools
      case TOOL_NAMES.WEB_SEARCH:
        return <RiSearchLine size={16} className="text-blue-500 dark:text-blue-400" />;
      case TOOL_NAMES.BROWSER_NAVIGATE:
        return <RiGlobalLine size={16} className="text-indigo-500 dark:text-indigo-400" />;
      case TOOL_NAMES.BROWSER_GET_MARKDOWN:
        return <RiNewspaperLine size={16} className="text-purple-500 dark:text-purple-400" />;
      case TOOL_NAMES.BROWSER_GET_CLICKABLE_ELEMENTS:
        return <FiFileText size={16} className="text-violet-500 dark:text-violet-400" />;
      case TOOL_NAMES.BROWSER_VISION_CONTROL:
        return <RiScreenshot2Line size={16} className="text-fuchsia-500 dark:text-fuchsia-400" />;
      case TOOL_NAMES.BROWSER_CLICK:
        return <RiCursorLine size={16} className="text-pink-500 dark:text-pink-400" />;

      // File system tools
      case TOOL_NAMES.READ_FILE:
        return <FiFileText size={16} className="text-emerald-500 dark:text-emerald-400" />;
      case TOOL_NAMES.LIST_DIRECTORY:
        return <RiFolderLine size={16} className="text-green-500 dark:text-green-400" />;
      case TOOL_NAMES.WRITE_FILE:
        return <FiSave size={16} className="text-sky-500 dark:text-sky-400" />;

      // Command tools
      case TOOL_NAMES.RUN_COMMAND:
        return <RiTerminalLine size={16} className="text-amber-500 dark:text-amber-400" />;
      case TOOL_NAMES.RUN_SCRIPT:
        return <FiCode size={16} className="text-rose-500 dark:text-rose-400" />;
    }

    // Fallback to category-based icons
    const category = getToolCategory(toolName);

    switch (category) {
      case TOOL_CATEGORIES.SEARCH:
        return <RiSearchLine size={16} className="text-blue-500 dark:text-blue-400" />;
      case TOOL_CATEGORIES.BROWSER:
        return <RiGlobalLine size={16} className="text-indigo-500 dark:text-indigo-400" />;
      case TOOL_CATEGORIES.BROWSER_VISION_CONTROL:
        return <RiScreenshot2Line size={16} className="text-fuchsia-500 dark:text-fuchsia-400" />;
      case TOOL_CATEGORIES.COMMAND:
        return <RiTerminalLine size={16} className="text-amber-500 dark:text-amber-400" />;
      case TOOL_CATEGORIES.SCRIPT:
        return <FiCode size={16} className="text-rose-500 dark:text-rose-400" />;
      case TOOL_CATEGORIES.FILE:
        return <FiFileText size={16} className="text-emerald-500 dark:text-emerald-400" />;
      case TOOL_CATEGORIES.IMAGE:
        return <FiImage size={16} className="text-purple-500 dark:text-purple-400" />;
      default:
        return <FiTool size={16} className="text-gray-500 dark:text-gray-400" />;
    }
  };

  return {
    getToolIcon,
  };
};
