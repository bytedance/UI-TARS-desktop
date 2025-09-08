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

// Direct tool name to icon mapping
const TOOL_ICON_MAP: Record<string, React.ReactNode> = {
  // Search tools
  web_search: <RiSearchLine size={16} className="text-blue-500 dark:text-blue-400" />,
  Search: <RiSearchLine size={16} className="text-blue-500 dark:text-blue-400" />,

  // Content tools
  LinkReader: <RiNewspaperLine size={16} className="text-purple-500 dark:text-purple-400" />,

  // Browser tools
  browser_navigate: <RiGlobalLine size={16} className="text-indigo-500 dark:text-indigo-400" />,
  browser_get_markdown: (
    <RiNewspaperLine size={16} className="text-purple-500 dark:text-purple-400" />
  ),
  browser_get_clickable_elements: (
    <FiFileText size={16} className="text-violet-500 dark:text-violet-400" />
  ),
  browser_vision_control: (
    <RiScreenshot2Line size={16} className="text-fuchsia-500 dark:text-fuchsia-400" />
  ),
  browser_click: <RiCursorLine size={16} className="text-pink-500 dark:text-pink-400" />,
  browser_screenshot: (
    <RiScreenshot2Line size={16} className="text-fuchsia-500 dark:text-fuchsia-400" />
  ),

  // File system tools
  read_file: <FiFileText size={16} className="text-emerald-500 dark:text-emerald-400" />,
  list_directory: <RiFolderLine size={16} className="text-green-500 dark:text-green-400" />,
  write_file: <FiSave size={16} className="text-sky-500 dark:text-sky-400" />,
  edit_file: <FiFileText size={16} className="text-emerald-500 dark:text-emerald-400" />,

  // Command tools
  run_command: <RiTerminalLine size={16} className="text-amber-500 dark:text-amber-400" />,
  run_script: <FiCode size={16} className="text-rose-500 dark:text-rose-400" />,
};

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
    // Direct tool name lookup
    if (TOOL_ICON_MAP[toolName]) {
      return TOOL_ICON_MAP[toolName];
    }

    // Pattern-based fallback for unknown tools
    const lowerName = toolName.toLowerCase();

    if (lowerName.includes('search')) {
      return <RiSearchLine size={16} className="text-blue-500 dark:text-blue-400" />;
    }
    if (lowerName.includes('browser')) {
      return <RiGlobalLine size={16} className="text-indigo-500 dark:text-indigo-400" />;
    }
    if (lowerName.includes('command') || lowerName.includes('terminal')) {
      return <RiTerminalLine size={16} className="text-amber-500 dark:text-amber-400" />;
    }
    if (lowerName.includes('script')) {
      return <FiCode size={16} className="text-rose-500 dark:text-rose-400" />;
    }
    if (lowerName.includes('file') || lowerName.includes('directory')) {
      return <FiFileText size={16} className="text-emerald-500 dark:text-emerald-400" />;
    }
    if (lowerName.includes('image')) {
      return <FiImage size={16} className="text-purple-500 dark:text-purple-400" />;
    }

    // Default fallback
    return <FiTool size={16} className="text-gray-500 dark:text-gray-400" />;
  };

  return {
    getToolIcon,
  };
};
