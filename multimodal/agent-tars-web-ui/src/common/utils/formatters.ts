import { getToolCategory, ToolCategory } from '@/common/constants/toolTypes';

/**
 * Format a timestamp to a user-friendly date string
 */
export const formatTimestamp = (timestamp: number, compact = false): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const date = new Date(timestamp);

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

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
export function determineToolType(name: string, content: any): ToolCategory {
  // Use the centralized tool category mapping
  const category = getToolCategory(name);

  // Additional content-based detection for edge cases
  if (category === 'other') {
    // Check content patterns for better categorization
    if (
      Array.isArray(content) &&
      content.some(
        (item) => item.type === 'text' && (item.name === 'RESULTS' || item.name === 'QUERY'),
      )
    ) {
      return 'search';
    }

    if (
      Array.isArray(content) &&
      content.some(
        (item) => item.type === 'text' && item.text && item.text.startsWith('Navigated to'),
      )
    ) {
      return 'browser';
    }

    if (
      content &&
      ((typeof content === 'object' && content.type === 'image') ||
        (typeof content === 'string' && content.startsWith('data:image/')))
    ) {
      return 'image';
    }

    if (Array.isArray(content) && content.some((item) => item.type === 'image_url')) {
      return 'image';
    }

    if (
      Array.isArray(content) &&
      content.some(
        (item) => item.type === 'text' && (item.name === 'STDOUT' || item.name === 'COMMAND'),
      )
    ) {
      return 'command';
    }
  }

  return category;
}
