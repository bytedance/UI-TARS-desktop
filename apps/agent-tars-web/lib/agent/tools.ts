import { ToolCall, WorkspaceItem, AgentSettings } from '@/lib/types';

export const BROWSER_TOOLS = ['navigate', 'click', 'fill_form', 'screenshot', 'get_tabs', 'switch_tab', 'evaluate', 'extract_text'];
export const COMPUTER_TOOLS = ['take_screenshot', 'click', 'type', 'key_press'];

export const TOOL_DEFINITIONS: Record<string, any> = {
  navigate: {
    description: 'Navigate to a URL in the browser',
    parameters: {
      url: { type: 'string', description: 'The URL to navigate to' },
    },
  },
  click: {
    description: 'Click on an element on the page',
    parameters: {
      selector: { type: 'string', description: 'CSS selector of the element to click' },
    },
  },
  fill_form: {
    description: 'Fill form fields with values',
    parameters: {
      fields: { type: 'object', description: 'Object mapping selectors to values' },
    },
  },
  screenshot: {
    description: 'Take a screenshot of the current browser view',
    parameters: {},
  },
  get_tabs: {
    description: 'Get list of open browser tabs',
    parameters: {},
  },
  switch_tab: {
    description: 'Switch to a specific browser tab',
    parameters: {
      tabId: { type: 'string', description: 'ID of the tab to switch to' },
    },
  },
  evaluate: {
    description: 'Execute JavaScript code in the browser',
    parameters: {
      code: { type: 'string', description: 'JavaScript code to execute' },
    },
  },
  extract_text: {
    description: 'Extract text content from the page',
    parameters: {
      selector: { type: 'string', description: 'CSS selector to extract text from' },
    },
  },
};

export async function executeTool(
  tool: ToolCall,
  settings: AgentSettings,
): Promise<WorkspaceItem> {
  // This will be called from the API route
  // The actual implementation depends on the backend (Browserbase, etc.)
  return {
    id: tool.id,
    type: tool.type as any,
    status: 'pending',
    timestamp: Date.now(),
  };
}
