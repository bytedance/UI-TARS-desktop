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
 * Configuration for mapping tools to renderers
 * Each condition is evaluated in order, first match wins
 */
type ToolToRendererCondition =
  | StaticToolToRendererCondition
  | FunctionToolToRendererCondition;

type StaticToolToRendererCondition = {
  toolName: string;
  renderer: string;
};

type FunctionToolToRendererCondition = (
  toolName: string,
  toolResponse: any
) => string | null; // Returns renderer name or null if condition doesn't match

const TOOL_TO_RENDERER_CONFIG: ToolToRendererCondition[] = [
  // Static tool name mappings
  { toolName: 'web_search', renderer: 'search_result' },
  { toolName: 'browser_vision_control', renderer: 'browser_vision_control' },
  { toolName: 'browser_screenshot', renderer: 'image' },
  { toolName: 'write_file', renderer: 'file_result' },
  { toolName: 'read_file', renderer: 'file_result' },
  { toolName: 'edit_file', renderer: 'diff_result' },
  { toolName: 'run_command', renderer: 'command_result' },
  { toolName: 'run_script', renderer: 'script_result' },
  { toolName: 'LinkReader', renderer: 'link_reader' },
  { toolName: 'Search', renderer: 'search_result' },
  { toolName: 'str_replace_editor', renderer: 'command_result' },
  { toolName: 'execute_bash', renderer: 'command_result' },
  { toolName: 'JupyterCI', renderer: 'script_result' },

  // Dynamic conditions based on content
  (toolName: string, content: any): string | null => {
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
    return null;
  },

  // Image content detection
  (toolName: string, content: any): string | null => {
    if (
      content &&
      ((typeof content === 'object' && content.type === 'image') ||
        (typeof content === 'string' && content.startsWith('data:image/')))
    ) {
      return 'image';
    }
    return null;
  },

  // Fallback to JSON renderer
  (toolName: string, content: any): string => 'json',
];

/**
 * Determine the renderer type from tool name and content
 * Uses the flexible condition-based configuration system
 */
export function determineToolType(name: string, content: any): string {
  for (const condition of TOOL_TO_RENDERER_CONFIG) {
    if (typeof condition === 'function') {
      const result = condition(name, content);
      if (result) {
        return result;
      }
    } else if (condition.toolName === name) {
      return condition.renderer;
    }
  }

  // This should never be reached due to the fallback function, but kept for safety
  return 'json';
}
