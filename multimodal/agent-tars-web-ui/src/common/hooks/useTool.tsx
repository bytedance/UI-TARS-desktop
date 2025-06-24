import React from 'react';
import {
  FiSearch,
  FiGlobe,
  FiFolder,
  FiTerminal,
  FiFileText,
  FiImage,
  FiEye,
  FiMousePointer,
  FiDownload,
  FiUpload,
  FiCpu,
  FiCode,
  FiList,
  FiSave,
  FiTool,
  FiDatabase,
} from 'react-icons/fi';
import {
  RiSearchLine,
  RiGlobalLine,
  RiFolderLine,
  RiTerminalLine,
  RiNewspaperLine,
  RiScreenshot2Line,
  RiCursorLine,
  RiDownload2Line,
  RiUpload2Line,
  RiCodeSSlashLine,
} from 'react-icons/ri';

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
    // Web tools
    if (toolName === 'web_search') {
      return <RiSearchLine size={14} className="text-blue-500 dark:text-blue-400" />;
    }
    if (toolName === 'browser_navigate') {
      return <RiGlobalLine size={14} className="text-indigo-500 dark:text-indigo-400" />;
    }
    if (toolName === 'browser_get_markdown') {
      return <RiNewspaperLine size={14} className="text-purple-500 dark:text-purple-400" />;
    }
    if (toolName === 'browser_get_text_content') {
      return <FiFileText size={14} className="text-violet-500 dark:text-violet-400" />;
    }
    if (toolName === 'browser_vision_control' || toolName === 'browser_control') {
      return <RiScreenshot2Line size={14} className="text-fuchsia-500 dark:text-fuchsia-400" />;
    }
    if (toolName === 'browser_click') {
      return <RiCursorLine size={14} className="text-pink-500 dark:text-pink-400" />;
    }

    // File system tools
    if (toolName === 'read_file' || toolName === 'open_file') {
      return <FiFileText size={14} className="text-emerald-500 dark:text-emerald-400" />;
    }
    if (toolName === 'list_directory' || toolName === 'list_files') {
      return <RiFolderLine size={14} className="text-green-500 dark:text-green-400" />;
    }
    if (toolName === 'download_file') {
      return <RiDownload2Line size={14} className="text-teal-500 dark:text-teal-400" />;
    }
    if (toolName === 'upload_file') {
      return <RiUpload2Line size={14} className="text-cyan-500 dark:text-cyan-400" />;
    }
    if (toolName === 'write_file' || toolName === 'save_file') {
      return <FiSave size={14} className="text-sky-500 dark:text-sky-400" />;
    }

    // Terminal tools
    if (toolName === 'run_command' || toolName === 'execute_command') {
      return <RiTerminalLine size={14} className="text-amber-500 dark:text-amber-400" />;
    }

    // Code tools
    if (toolName === 'analyze_code' || toolName === 'code_analysis') {
      return <FiCode size={14} className="text-rose-500 dark:text-rose-400" />;
    }

    // Database tools
    if (toolName.includes('sql') || toolName.includes('database')) {
      return <FiDatabase size={14} className="text-orange-500 dark:text-orange-400" />;
    }

    // Fallback for other tools
    return <FiTool size={14} className="text-gray-500 dark:text-gray-400" />;
  };

  return {
    getToolIcon,
  };
};
