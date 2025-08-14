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
 * Direct mapping from tool name to renderer type
 * Simple one-to-one mapping without intermediate categories
 */
const TOOL_TO_RENDERER_MAP: Record<string, string> = {
  // Content tools
  LinkReader: 'link_reader',

  // Search tools
  web_search: 'search_result',
  Search: 'search_result',

  // Browser tools
  browser_vision_control: 'browser_vision_control',
  browser_screenshot: 'image',

  // File tools
  write_file: 'file_result',
  read_file: 'file_result',
  edit_file: 'diff_result',

  // Command tools
  run_command: 'command_result',
  run_script: 'script_result',
};

/**
 * Determine the renderer type from tool name and content
 * Returns specific renderer types for direct mapping
 */
export function determineToolType(name: string, content: any): string {
  // Direct tool name mapping
  if (TOOL_TO_RENDERER_MAP[name]) {
    return TOOL_TO_RENDERER_MAP[name];
  }

  // Content-based detection for edge cases
  if (Array.isArray(content)) {
    if (
      content.some(
        (item) => item.type === 'text' && (item.name === 'RESULTS' || item.name === 'QUERY'),
      )
    ) {
      return 'search_result';
    }

    if (content.some((item) => item.type === 'text' && item.text?.startsWith('Navigated to'))) {
      return 'browser_result';
    }

    if (content.some((item) => item.type === 'image_url')) {
      return 'image';
    }

    if (
      content.some(
        (item) => item.type === 'text' && (item.name === 'STDOUT' || item.name === 'COMMAND'),
      )
    ) {
      return 'command_result';
    }
  }

  // Image content detection
  if (
    content &&
    ((typeof content === 'object' && content.type === 'image') ||
      (typeof content === 'string' && content.startsWith('data:image/')))
  ) {
    return 'image';
  }

  // Fallback to generic JSON renderer
  return 'json';
}
