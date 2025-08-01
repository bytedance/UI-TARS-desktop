/**
 * Tool type constants and utilities
 * Central definition of all tool types to avoid duplication and magic strings
 */

// Tool name constants derived from the actual tool registry
export const TOOL_NAMES = {
  // General tools
  WEB_SEARCH: 'web_search',

  // Browser tools
  BROWSER_VISION_CONTROL: 'browser_vision_control',
  BROWSER_CLICK: 'browser_click',
  BROWSER_CLOSE_TAB: 'browser_close_tab',
  BROWSER_EVALUATE: 'browser_evaluate',
  BROWSER_FORM_INPUT_FILL: 'browser_form_input_fill',
  BROWSER_GET_CLICKABLE_ELEMENTS: 'browser_get_clickable_elements',
  BROWSER_GET_MARKDOWN: 'browser_get_markdown',
  BROWSER_GO_BACK: 'browser_go_back',
  BROWSER_GO_FORWARD: 'browser_go_forward',
  BROWSER_HOVER: 'browser_hover',
  BROWSER_NAVIGATE: 'browser_navigate',
  BROWSER_NEW_TAB: 'browser_new_tab',
  BROWSER_PRESS_KEY: 'browser_press_key',
  BROWSER_READ_LINKS: 'browser_read_links',
  BROWSER_SCREENSHOT: 'browser_screenshot',
  BROWSER_SCROLL: 'browser_scroll',
  BROWSER_SELECT: 'browser_select',
  BROWSER_SWITCH_TAB: 'browser_switch_tab',
  BROWSER_TAB_LIST: 'browser_tab_list',

  // Filesystem tools
  CREATE_DIRECTORY: 'create_directory',
  DIRECTORY_TREE: 'directory_tree',
  EDIT_FILE: 'edit_file',
  GET_FILE_INFO: 'get_file_info',
  LIST_ALLOWED_DIRECTORIES: 'list_allowed_directories',
  LIST_DIRECTORY: 'list_directory',
  MOVE_FILE: 'move_file',
  READ_FILE: 'read_file',
  READ_MULTIPLE_FILES: 'read_multiple_files',
  SEARCH_FILES: 'search_files',
  WRITE_FILE: 'write_file',

  // Command tools
  RUN_COMMAND: 'run_command',
  RUN_SCRIPT: 'run_script',
} as const;

// Tool name type derived from constants
export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

// Tool category constants
export const TOOL_CATEGORIES = {
  SEARCH: 'search',
  BROWSER: 'browser',
  COMMAND: 'command',
  SCRIPT: 'script',
  IMAGE: 'image',
  FILE: 'file',
  BROWSER_VISION_CONTROL: 'browser_vision_control',
  OTHER: 'other',
} as const;

// Tool category type derived from constants
export type ToolCategory = (typeof TOOL_CATEGORIES)[keyof typeof TOOL_CATEGORIES];

// Tool name to category mapping
export const TOOL_NAME_TO_CATEGORY_MAP: Record<ToolName, ToolCategory> = {
  // General tools
  [TOOL_NAMES.WEB_SEARCH]: TOOL_CATEGORIES.SEARCH,

  // Browser tools
  [TOOL_NAMES.BROWSER_VISION_CONTROL]: TOOL_CATEGORIES.BROWSER_VISION_CONTROL,
  [TOOL_NAMES.BROWSER_CLICK]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_CLOSE_TAB]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_EVALUATE]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_FORM_INPUT_FILL]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_GET_CLICKABLE_ELEMENTS]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_GET_MARKDOWN]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_GO_BACK]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_GO_FORWARD]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_HOVER]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_NAVIGATE]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_NEW_TAB]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_PRESS_KEY]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_READ_LINKS]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_SCREENSHOT]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_SCROLL]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_SELECT]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_SWITCH_TAB]: TOOL_CATEGORIES.BROWSER,
  [TOOL_NAMES.BROWSER_TAB_LIST]: TOOL_CATEGORIES.BROWSER,

  // Filesystem tools
  [TOOL_NAMES.CREATE_DIRECTORY]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.DIRECTORY_TREE]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.EDIT_FILE]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.GET_FILE_INFO]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.LIST_ALLOWED_DIRECTORIES]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.LIST_DIRECTORY]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.MOVE_FILE]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.READ_FILE]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.READ_MULTIPLE_FILES]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.SEARCH_FILES]: TOOL_CATEGORIES.FILE,
  [TOOL_NAMES.WRITE_FILE]: TOOL_CATEGORIES.FILE,

  // Command tools
  [TOOL_NAMES.RUN_COMMAND]: TOOL_CATEGORIES.COMMAND,
  [TOOL_NAMES.RUN_SCRIPT]: TOOL_CATEGORIES.SCRIPT,
};

// Helper function to get tool category from tool name
export function getToolCategory(toolName: string): ToolCategory {
  if (!toolName) {
    return TOOL_CATEGORIES.OTHER;
  }
  // Check if it's a known tool name
  if (toolName in TOOL_NAME_TO_CATEGORY_MAP) {
    return TOOL_NAME_TO_CATEGORY_MAP[toolName as ToolName];
  }

  // Fallback to pattern matching for unknown tools
  const lowerName = toolName.toLowerCase();

  if (lowerName.includes('search')) return TOOL_CATEGORIES.SEARCH;
  if (lowerName.includes('browser')) return TOOL_CATEGORIES.BROWSER;
  if (lowerName.includes('command') || lowerName.includes('terminal'))
    return TOOL_CATEGORIES.COMMAND;
  if (lowerName.includes('script')) return TOOL_CATEGORIES.SCRIPT;
  if (lowerName.includes('file') || lowerName.includes('directory')) return TOOL_CATEGORIES.FILE;

  return TOOL_CATEGORIES.OTHER;
}

// Legacy compatibility - export as TOOL_TYPES for backward compatibility
export const TOOL_TYPES = TOOL_CATEGORIES;
