import { API_BASE_URL } from '@/config/web-ui-config';
import type {
  MCPServer,
  MCPTool,
  MCPServerStatusResponse,
  MCPApiResponse,
  MCPServersResponse,
  MCPToolsResponse,
  MCPToolCallResult,
  MCPStreamEvent,
} from '@/common/types/mcp';

/*
 * Mock mode flag - set to true for Phase A development
 * Set to false when backend is ready (Phase B)
 */
const USE_MOCK_DATA = false;

/**
 * Mock MCP Servers for Phase A
 */
const MOCK_SERVERS: MCPServer[] = [
  {
    name: 'tavily-search',
    type: 'command',
    status: 'active',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-tavily'],
    env: { TAVILY_API_KEY: 'tvly-***' },
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
  {
    name: 'filesystem',
    type: 'command',
    status: 'inactive',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/workspace'],
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 7200000,
  },
  {
    name: 'github-api',
    type: 'http',
    status: 'error',
    url: 'https://api.github.com/mcp',
    lastError: 'Connection timeout',
    lastErrorTime: Date.now() - 1800000,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 1800000,
  },
  {
    name: 'postgres-db',
    type: 'command',
    status: 'activating',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: { DATABASE_URL: 'postgresql://localhost:5432/mydb' },
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 300000,
  },
];

/**
 * Mock MCP Tools for Phase A
 */
const MOCK_TOOLS: Record<string, MCPTool[]> = {
  'tavily-search': [
    {
      id: 'search',
      name: 'search',
      description: 'Search the web using Tavily API',
      parametersSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results',
            default: 5,
            minimum: 1,
            maximum: 20,
          },
          include_images: {
            type: 'boolean',
            description: 'Include images in results',
            default: false,
          },
        },
        required: ['query'],
      },
    },
  ],
  filesystem: [
    {
      id: 'read_file',
      name: 'read_file',
      description: 'Read contents of a file',
      parametersSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path',
          },
        },
        required: ['path'],
      },
    },
    {
      id: 'write_file',
      name: 'write_file',
      description: 'Write content to a file',
      parametersSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path',
          },
          content: {
            type: 'string',
            description: 'File content',
          },
        },
        required: ['path', 'content'],
      },
    },
    {
      id: 'list_directory',
      name: 'list_directory',
      description: 'List files in a directory',
      parametersSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path',
            default: '.',
          },
        },
      },
    },
  ],
  'postgres-db': [
    {
      id: 'query',
      name: 'query',
      description: 'Execute SQL query',
      parametersSchema: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description: 'SQL query to execute',
          },
        },
        required: ['sql'],
      },
    },
  ],
};

/**
 * MCP Service - Handles MCP server management and tool calls
 */
class McpService {
  /**
   * Get all MCP servers
   */
  async getServers(): Promise<MCPServer[]> {
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...MOCK_SERVERS];
    }

    try {
  const response = await fetch(`${API_BASE_URL}/mcp/servers`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get servers: ${response.statusText}`);
      }

      const data: MCPServersResponse = await response.json();
      return data.servers;
    } catch (error) {
      console.error('Error getting MCP servers:', error);
      throw error;
    }
  }

  /**
   * Add a new MCP server
   */
  async addServer(server: Omit<MCPServer, 'createdAt' | 'updatedAt'>): Promise<MCPServer> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newServer: MCPServer = {
        ...server,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      MOCK_SERVERS.push(newServer);
      return newServer;
    }

    try {
  const response = await fetch(`${API_BASE_URL}/mcp/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add server: ${response.statusText}`);
      }

      const data: MCPApiResponse<{ server: MCPServer }> = await response.json();
      return data.data!.server;
    } catch (error) {
      console.error('Error adding MCP server:', error);
      throw error;
    }
  }

  /**
   * Update an existing MCP server
   */
  async updateServer(
    name: string,
    updates: Partial<Omit<MCPServer, 'name' | 'createdAt' | 'updatedAt'>>
  ): Promise<MCPServer> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const index = MOCK_SERVERS.findIndex((s) => s.name === name);
      if (index === -1) {
        throw new Error(`Server ${name} not found`);
      }
      MOCK_SERVERS[index] = {
        ...MOCK_SERVERS[index],
        ...updates,
        updatedAt: Date.now(),
      };
      return MOCK_SERVERS[index];
    }

    try {
  const response = await fetch(`${API_BASE_URL}/mcp/servers/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: updates }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update server: ${response.statusText}`);
      }

      const data: MCPApiResponse<{ server: MCPServer }> = await response.json();
      return data.data!.server;
    } catch (error) {
      console.error(`Error updating MCP server (${name}):`, error);
      throw error;
    }
  }

  /**
   * Delete an MCP server
   */
  async deleteServer(name: string): Promise<boolean> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const index = MOCK_SERVERS.findIndex((s) => s.name === name);
      if (index === -1) {
        throw new Error(`Server ${name} not found`);
      }
      MOCK_SERVERS.splice(index, 1);
      return true;
    }

    try {
  const response = await fetch(`${API_BASE_URL}/mcp/servers/${name}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete server: ${response.statusText}`);
      }

      const data: MCPApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error(`Error deleting MCP server (${name}):`, error);
      throw error;
    }
  }

  /**
   * Activate or deactivate a server
   */
  async setServerActive(name: string, activate: boolean): Promise<MCPServerStatusResponse> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const server = MOCK_SERVERS.find((s) => s.name === name);
      if (!server) {
        throw new Error(`Server ${name} not found`);
      }
      server.status = activate ? 'active' : 'inactive';
      server.updatedAt = Date.now();
      return { status: server.status };
    }

    try {
  const response = await fetch(`${API_BASE_URL}/mcp/servers/${name}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activate }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set server active state: ${response.statusText}`);
      }

      const data: MCPApiResponse<MCPServerStatusResponse> = await response.json();
      return data.data!;
    } catch (error) {
      console.error(`Error setting server active state (${name}):`, error);
      throw error;
    }
  }

  /**
   * Get server status
   */
  async getServerStatus(name: string): Promise<MCPServerStatusResponse> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const server = MOCK_SERVERS.find((s) => s.name === name);
      if (!server) {
        throw new Error(`Server ${name} not found`);
      }
      return {
        status: server.status,
        lastError: server.lastError,
        detail: server.lastErrorTime ? { lastErrorTime: server.lastErrorTime } : undefined,
      };
    }

    try {
  const response = await fetch(`${API_BASE_URL}/mcp/servers/${name}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get server status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error getting server status (${name}):`, error);
      throw error;
    }
  }

  /**
   * Get tools for a server
   */
  async getServerTools(name: string): Promise<MCPTool[]> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return MOCK_TOOLS[name] || [];
    }

    try {
  const response = await fetch(`${API_BASE_URL}/mcp/servers/${name}/tools`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get server tools: ${response.statusText}`);
      }

      const data: MCPToolsResponse = await response.json();
      return data.tools;
    } catch (error) {
      console.error(`Error getting server tools (${name}):`, error);
      throw error;
    }
  }

  /**
   * Call a tool (non-streaming)
   */
  async callTool(serverName: string, toolId: string, args: any): Promise<MCPToolCallResult> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        result: {
          message: `Mock result for ${toolId}`,
          args,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };
    }

    try {
      const response = await fetch(
  `${API_BASE_URL}/mcp/servers/${serverName}/tools/${toolId}/call`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ args, stream: false }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to call tool: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        result: data.result,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Error calling tool (${serverName}/${toolId}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Call a tool with streaming response
   */
  async callToolStreaming(
    serverName: string,
    toolId: string,
    args: any,
    onEvent: (event: MCPStreamEvent) => void
  ): Promise<void> {
    if (USE_MOCK_DATA) {
      // Simulate streaming events
      await new Promise((resolve) => setTimeout(resolve, 300));
      onEvent({ type: 'partial', data: { chunk: 'Processing request...' } });
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      onEvent({ type: 'partial', data: { chunk: 'Executing tool...' } });
      
      await new Promise((resolve) => setTimeout(resolve, 400));
      onEvent({
        type: 'done',
        data: {
          result: `Mock streaming result for ${toolId}`,
          args,
          timestamp: Date.now(),
        },
      });
      return;
    }

    try {
      const response = await fetch(
  `${API_BASE_URL}/mcp/servers/${serverName}/tools/${toolId}/call`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ args, stream: true }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to call tool: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let eventEndIndex;
        while ((eventEndIndex = buffer.search(/\r\n\r\n|\n\n|\r\r/)) !== -1) {
          const eventString = buffer.slice(0, eventEndIndex);
          const sepLength = buffer.substr(eventEndIndex, 4) === '\r\n\r\n' ? 4 : 2;
          buffer = buffer.slice(eventEndIndex + sepLength);

          if (eventString.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(eventString.substring(6));
              onEvent(eventData);
            } catch (e) {
              console.error('Error parsing event data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error in streaming tool call (${serverName}/${toolId}):`, error);
      onEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Cleanup all servers
   */
  async cleanupServers(): Promise<boolean> {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      MOCK_SERVERS.forEach((server) => {
        server.status = 'inactive';
        server.updatedAt = Date.now();
      });
      return true;
    }

    try {
  const response = await fetch(`${API_BASE_URL}/mcp/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to cleanup servers: ${response.statusText}`);
      }

      const data: MCPApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error cleaning up servers:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mcpService = new McpService();