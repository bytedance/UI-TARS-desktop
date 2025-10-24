import type { AgentServerInitOptions } from '../types';
import type { AgentServer } from '../server';

// Try to import MCPClient from workspace package if available
let MCPClient: any = null;
try {
  // Use dynamic require via eval to avoid bundlers resolving this at build-time
  // eslint-disable-next-line no-eval
  const req: any = eval('require');
  MCPClient = req('@agent-infra/mcp-client')?.MCPClient ?? null;
} catch (e) {
  // package not available — we'll fallback to a minimal in-memory stub
  MCPClient = null;
}

/**
 * Simple wrapper around the MCPClient (if present) or a minimal stub.
 * The wrapper exposes the methods used by the frontend service.
 */
export class McpManager {
  private server: AgentServer;
  private client: any;

  constructor(server: AgentServer) {
    this.server = server;
    // Initialize MCP client with empty servers list — servers will be added via API
    if (MCPClient) {
      this.client = new MCPClient([], { isDebug: server.isDebug });
    } else {
      this.client = null; // fallback behavior implemented in methods
    }
  }

  async init(): Promise<void> {
    if (this.client && typeof this.client.init === 'function') {
      try {
        await this.client.init();
      } catch (err) {
        // ignore init errors for now
        console.error('McpManager: MCPClient init error:', err);
      }
    }
  }

  async listServers(): Promise<any[]> {
    if (this.client) return this.client.listAvailableServices();
    return [];
  }

  async addServer(server: any): Promise<any> {
    if (this.client) {
      await this.client.addServer(server);
      return server;
    }
    // fallback: do nothing persistent, just return input
    return server;
  }

  async updateServer(server: any): Promise<any> {
    if (this.client) {
      await this.client.updateServer(server);
      return server;
    }
    return server;
  }

  async deleteServer(name: string): Promise<void> {
    if (this.client) return this.client.deleteServer(name);
    return;
  }

  async setServerActive(name: string, isActive: boolean): Promise<any> {
    if (this.client) {
      await this.client.setServerActive({ name, isActive });
      return { status: isActive ? 'active' : 'inactive' };
    }
    return { status: isActive ? 'active' : 'inactive' };
  }

  async getServerStatus(name: string): Promise<any> {
    if (this.client) {
      const server = await this.client.getServer(name);
      return server || { status: 'unknown' };
    }
    return { status: 'unknown' };
  }

  async listTools(name: string): Promise<any[]> {
    if (this.client) return this.client.listTools(name);
    return [];
  }

  async callTool(clientName: string, toolName: string, args: any): Promise<any> {
    if (this.client) {
      return this.client.callTool({ client: clientName, name: toolName, args });
    }
    // fallback: return a mock result
    return { success: true, result: { message: `mock call ${toolName}`, args } };
  }

  // For streaming, we try to call client.callTool and return an async iterator if available.
  // Fallback: return an array-wrapped iterator with a single done event.
  async callToolStreaming(clientName: string, toolName: string, args: any): Promise<any> {
    if (this.client && typeof this.client.callTool === 'function') {
      try {
        const result = await this.client.callTool({ client: clientName, name: toolName, args });
        // return an async iterable that yields a done event
        async function* iter() {
          yield { type: 'done', data: result };
        }
        return iter();
      } catch (err) {
        async function* iterErr() {
          yield { type: 'error', error: err instanceof Error ? err.message : String(err) };
        }
        return iterErr();
      }
    }

    // fallback iterator
    async function* fallback() {
      yield { type: 'done', data: { success: true, result: `mock streaming ${toolName}`, args } };
    }
    return fallback();
  }

  async cleanup(): Promise<void> {
    if (this.client && typeof this.client.cleanup === 'function') {
      return this.client.cleanup();
    }
    return;
  }
}

export function createMcpManager(server: AgentServer) {
  const mgr = new McpManager(server);
  return mgr;
}
