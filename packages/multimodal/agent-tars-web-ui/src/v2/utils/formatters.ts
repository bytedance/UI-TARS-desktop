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

  // Check the tool name first
  if (lowerName.includes('search')) return TOOL_TYPES.SEARCH;
  if (lowerName.includes('browser')) return TOOL_TYPES.BROWSER;
  if (lowerName.includes('command') || lowerName.includes('terminal')) return TOOL_TYPES.COMMAND;
  if (lowerName.includes('file') || lowerName.includes('document')) return TOOL_TYPES.FILE;

  // Check if content contains image data
  if (
    content &&
    ((typeof content === 'object' && content.type === 'image') ||
      (typeof content === 'string' && content.startsWith('data:image/')))
  ) {
    return TOOL_TYPES.IMAGE;
  }

  return TOOL_TYPES.OTHER;
}
