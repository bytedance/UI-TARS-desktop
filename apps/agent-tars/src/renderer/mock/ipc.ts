import { MCPToolResult } from '../../main/type';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock tool result for web_search
const mockSearchResult: MCPToolResult = [
  {
    isError: false,
    content: [
      {
        title: 'Mock Search Result 1',
        url: 'https://example.com/1',
        snippet: 'This is a mock search result.',
      },
      {
        title: 'Mock Search Result 2',
        url: 'https://example.com/2',
        snippet: 'Another mock search result.',
      },
    ],
  },
];

// Mock tools list
const mockTools = [
  {
    name: 'web_search',
    description: 'Search in the internet',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
      },
      required: ['query'],
    },
  },
];

export const createClient = () => ({
  askLLMText: async () => {
    await delay(1000);
    return "I'm a mock response from the LLM.";
  },

  askLLMTool: async () => {
    await delay(1000);
    return {
      content: null,
      tool_calls: [
        {
          id: 'mock-tool-call',
          type: 'function',
          function: {
            name: 'web_search',
            arguments: JSON.stringify({
              query: 'mock search query',
            }),
          },
        },
      ],
    };
  },

  askLLMTextStream: async ({ requestId }: { requestId: string }) => {
    return requestId;
  },

  abortRequest: async ({ requestId }: { requestId: string }) => {
    return true;
  },

  listTools: async () => {
    await delay(500);
    return mockTools;
  },

  listMcpTools: async () => {
    await delay(500);
    return [];
  },

  listCustomTools: async () => {
    await delay(500);
    return mockTools;
  },

  executeTool: async () => {
    await delay(1000);
    return mockSearchResult;
  },

  saveBrowserSnapshot: async () => {
    await delay(500);
    return {
      filepath: '/mock/path/to/screenshot.png',
    };
  },

  saveReportHtml: async () => {
    await delay(500);
    return '/mock/path/to/report.html';
  },

  cleanup: async () => {
    return true;
  },

  runAgent: async () => {
    return 'Hello from mock agent';
  },

  updateFileSystemSettings: async () => {
    return true;
  },

  getSettings: async () => {
    return {
      model: {},
      fileSystem: {
        availableDirectories: ['/mock/path/to/allowed/directories'],
      },
      search: {},
    };
  },
  getAllowedDirectories: async () => {
    return ['/mock/path/to/allowed/directories'];
  },
});

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, listener: (...args: any[]) => void) => void;
        once: (channel: string, listener: (...args: any[]) => void) => void;
        off: (channel: string, listener: (...args: any[]) => void) => void;
      };
    };
  }
}
window.electron = {
  ipcRenderer: {
    invoke: async () => {
      // noop
    },
    on: async () => {
      // noop
    },
    once: async () => {
      // noop
    },
    off: async () => {
      // noop
    },
  },
};
