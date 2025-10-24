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


/**
 * MCP Service - Handles MCP server management and tool calls
 */
class McpService {
  /**
   * Get all MCP servers
   */
  async getServers(): Promise<MCPServer[]> {
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
    try {
  const response = await fetch(`${API_BASE_URL}/mcp/servers/add`, {
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