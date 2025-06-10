import { ToolResult } from '../types';
import { TOOL_TYPES } from '../constants';

/**
 * Format a timestamp to a user-friendly date string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format a date relative to today (Today, Yesterday, or date)
 */
export function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

/**
 * Determine the tool type from name and content
 */
export function determineToolType(name: string, content: any): ToolResult['type'] {
  const lowerName = name.toLowerCase();

  // Add specialized browser_vision_control detection
  if (lowerName === 'browser_vision_control') {
    return 'browser_vision_control';
  }

  // Check the tool name first
  if (lowerName.includes('search') || lowerName.includes('web_search')) return TOOL_TYPES.SEARCH;
  if (lowerName.includes('browser')) return TOOL_TYPES.BROWSER;
  if (
    lowerName.includes('command') ||
    lowerName.includes('terminal') ||
    lowerName === 'run_command'
  )
    return TOOL_TYPES.COMMAND;
  if (lowerName.includes('file') || lowerName.includes('document')) return TOOL_TYPES.FILE;

  // 检查内容是否是新格式的搜索结果
  if (
    Array.isArray(content) &&
    content.some(
      (item) => item.type === 'text' && (item.name === 'RESULTS' || item.name === 'QUERY'),
    )
  ) {
    return TOOL_TYPES.SEARCH;
  }

  // 检查内容是否是新格式的浏览器导航结果
  if (
    Array.isArray(content) &&
    content.some(
      (item) => item.type === 'text' && item.text && item.text.startsWith('Navigated to'),
    )
  ) {
    return TOOL_TYPES.BROWSER;
  }

  // Check if content contains image data
  if (
    content &&
    ((typeof content === 'object' && content.type === 'image') ||
      (typeof content === 'string' && content.startsWith('data:image/')))
  ) {
    return TOOL_TYPES.IMAGE;
  }

  // 检查内容是否是新格式的命令执行结果
  if (
    Array.isArray(content) &&
    content.some(
      (item) => item.type === 'text' && (item.name === 'STDOUT' || item.name === 'COMMAND'),
    )
  ) {
    return TOOL_TYPES.COMMAND;
  }

  return TOOL_TYPES.OTHER;
}
