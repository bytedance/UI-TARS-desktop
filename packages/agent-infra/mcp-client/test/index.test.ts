import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPClient, MCPTool } from '../src/index';
import type { MCPServer } from '../src/index';
import type {
  BuiltInMCPServer,
  StdioMCPServer,
  SSEMCPServer,
  StreamableHTTPMCPServer,
} from '@agent-infra/mcp-shared/client';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Mock implementation of an MCP server for testing
class MockMCPServer extends McpServer {
  private tools: Tool[] = [];
  private prompts: any[] = [];

  constructor() {
    super(
      {
        name: 'mock-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      },
    );
  }

  setTools(tools: Tool[]) {
    this.tools = tools;
    this.server.setRequestHandler(
      z.object({ method: z.literal('tools/list') }),
      async () => ({ tools: this.tools }),
    );
  }

  setPrompts(prompts: any[]) {
    this.prompts = prompts;
    this.server.setRequestHandler(
      z.object({ method: z.literal('prompts/list') }),
      async () => ({ prompts: this.prompts }),
    );
  }

  setupToolCall(toolName: string, mockResult: any) {
    this.server.setRequestHandler(
      z.object({
        method: z.literal('tools/call'),
        params: z.object({ name: z.string() }).optional(),
      }),
      async (request: any) => {
        if (request.params?.name === toolName) {
          return mockResult;
        }
        throw new Error(`Tool ${request.params?.name} not found`);
      },
    );
  }

  setupSlowToolCall(toolName: string, delayMs: number, mockResult?: any) {
    this.server.setRequestHandler(
      z.object({
        method: z.literal('tools/call'),
        params: z.object({ name: z.string() }).optional(),
      }),
      async (request: any) => {
        if (request.params?.name === toolName) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return (
            mockResult || {
              content: [{ type: 'text', text: 'Slow tool result' }],
              isError: false,
            }
          );
        }
        throw new Error(`Tool ${request.params?.name} not found`);
      },
    );
  }
}

describe('MCPClient', () => {
  let client: MCPClient;
  let mockServer: MockMCPServer;

  beforeEach(() => {
    mockServer = new MockMCPServer();
  });

  afterEach(async () => {
    if (client) {
      await client.cleanup();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should create MCPClient with servers', () => {
      const servers: MCPServer[] = [
        {
          name: 'test-server',
          mcpServer: mockServer,
          status: 'activate',
        },
      ];

      client = new MCPClient(servers);
      expect(client).toBeInstanceOf(MCPClient);
    });

    it('should initialize with debug mode', () => {
      const servers: MCPServer[] = [
        {
          name: 'test-server',
          mcpServer: mockServer,
          status: 'activate',
        },
      ];

      client = new MCPClient(servers, { isDebug: true });
      expect(client).toBeInstanceOf(MCPClient);
    });

    it('should initialize servers on init', async () => {
      const servers: MCPServer[] = [
        {
          name: 'test-server',
          mcpServer: mockServer,
          status: 'activate',
        },
      ];

      client = new MCPClient(servers);
      await client.init();

      const availableServices = await client.listAvailableServices();
      expect(availableServices).toHaveLength(1);
      expect(availableServices[0].name).toBe('test-server');
    });

    it('should handle multiple init calls gracefully', async () => {
      const servers: MCPServer[] = [
        {
          name: 'test-server',
          mcpServer: mockServer,
          status: 'activate',
        },
      ];

      client = new MCPClient(servers);

      // Call init multiple times
      await Promise.all([client.init(), client.init(), client.init()]);

      const services = await client.listAvailableServices();
      expect(services).toHaveLength(1);
    });
  });

  describe('Server Management', () => {
    beforeEach(async () => {
      client = new MCPClient([]);
      await client.init();
    });

    it('should add a new server', async () => {
      const server: BuiltInMCPServer = {
        name: 'new-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      await client.addServer(server);

      const services = await client.listAvailableServices();
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('new-server');
    });

    it('should prevent adding duplicate servers', async () => {
      const server: BuiltInMCPServer = {
        name: 'duplicate-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      await client.addServer(server);

      await expect(client.addServer(server)).rejects.toThrow(
        'Server with name duplicate-server already exists',
      );
    });

    it('should get server by name', async () => {
      const server: BuiltInMCPServer = {
        name: 'get-server-test',
        mcpServer: mockServer,
        status: 'activate',
      };

      await client.addServer(server);
      const retrievedServer = await client.getServer('get-server-test');

      expect(retrievedServer).toBeDefined();
      expect(retrievedServer?.name).toBe('get-server-test');
    });

    it('should update server configuration', async () => {
      const server: BuiltInMCPServer = {
        name: 'update-server',
        mcpServer: mockServer,
        status: 'activate',
        description: 'Original description',
      };

      await client.addServer(server);

      const updatedServer: BuiltInMCPServer = {
        ...server,
        description: 'Updated description',
        status: 'error',
      };

      await client.updateServer(updatedServer);

      const retrievedServer = await client.getServer('update-server');
      expect(retrievedServer?.description).toBe('Updated description');
      expect(retrievedServer?.status).toBe('error');
    });

    it('should delete server', async () => {
      const server: BuiltInMCPServer = {
        name: 'delete-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      await client.addServer(server);
      expect(await client.listAvailableServices()).toHaveLength(1);

      await client.deleteServer('delete-server');
      expect(await client.listAvailableServices()).toHaveLength(0);
    });

    it('should set server active status', async () => {
      const server: BuiltInMCPServer = {
        name: 'status-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      await client.addServer(server);

      await client.setServerActive({ name: 'status-server', isActive: false });
      const retrievedServer = await client.getServer('status-server');
      expect(retrievedServer?.status).toBe('error');

      await client.setServerActive({ name: 'status-server', isActive: true });
      const retrievedServerAgain = await client.getServer('status-server');
      expect(retrievedServerAgain?.status).toBe('activate');
    });
  });

  describe('Tools Management', () => {
    beforeEach(async () => {
      const mockTools: Tool[] = [
        {
          name: 'test-tool-1',
          description: 'Test tool 1',
          inputSchema: {
            type: 'object',
            properties: {
              param1: { type: 'string' },
            },
          },
        },
        {
          name: 'test-tool-2',
          description: 'Test tool 2',
          inputSchema: {
            type: 'object',
            properties: {
              param2: { type: 'number' },
            },
          },
        },
      ];

      mockServer.setTools(mockTools);

      const server: BuiltInMCPServer = {
        name: 'tools-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      client = new MCPClient([server]);
      await client.init();
    });

    it('should list all tools', async () => {
      const tools = await client.listTools();

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('test-tool-1');
      expect(tools[0].serverName).toBe('tools-server');
      expect(tools[0].id).toMatch(/^f[a-f0-9]{32}$/);
      expect(tools[1].name).toBe('test-tool-2');
      expect(tools[1].serverName).toBe('tools-server');
    });

    it('should list tools for specific server', async () => {
      const tools = await client.listTools('tools-server');

      expect(tools).toHaveLength(2);
      expect(tools[0].serverName).toBe('tools-server');
    });

    it('should handle tools listing error gracefully', async () => {
      const tools = await client.listTools('non-existent-server');
      expect(tools).toHaveLength(0);
    });

    it('should call tool successfully', async () => {
      const mockResult = {
        content: [{ type: 'text', text: 'Tool execution result' }],
        isError: false,
      };

      mockServer.setupToolCall('test-tool-1', mockResult);

      const result = await client.callTool({
        client: 'tools-server',
        name: 'test-tool-1',
        args: { param1: 'test-value' },
      });

      expect(result).toEqual(mockResult);
    });

    it('should handle tool call error', async () => {
      await expect(
        client.callTool({
          client: 'tools-server',
          name: 'non-existent-tool',
          args: {},
        }),
      ).rejects.toThrow();
    });

    it('should handle calling tool on non-existent server', async () => {
      await expect(
        client.callTool({
          client: 'non-existent-server',
          name: 'test-tool-1',
          args: {},
        }),
      ).rejects.toThrow('MCP Client non-existent-server not found');
    });
  });

  describe('Prompts Management', () => {
    beforeEach(async () => {
      const mockPrompts = [
        {
          name: 'test-prompt-1',
          description: 'Test prompt 1',
        },
        {
          name: 'test-prompt-2',
          description: 'Test prompt 2',
        },
      ];

      mockServer.setPrompts(mockPrompts);

      const server: BuiltInMCPServer = {
        name: 'prompts-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      client = new MCPClient([server]);
      await client.init();
    });

    it('should list all prompts', async () => {
      const prompts = await client.listPrompts();

      expect(prompts).toHaveLength(2);
      expect(prompts[0].name).toBe('test-prompt-1');
      expect(prompts[0].serverName).toBe('prompts-server');
      expect(prompts[0].id).toMatch(/^p[a-f0-9]{32}$/);
      expect(prompts[1].name).toBe('test-prompt-2');
      expect(prompts[1].serverName).toBe('prompts-server');
    });

    it('should list prompts for specific server', async () => {
      const prompts = await client.listPrompts('prompts-server');

      expect(prompts).toHaveLength(2);
      expect(prompts[0].serverName).toBe('prompts-server');
    });

    it('should handle prompts listing error gracefully', async () => {
      const prompts = await client.listPrompts('non-existent-server');
      expect(prompts).toHaveLength(0);
    });
  });

  describe('Filtering', () => {
    it('should apply allow and block filters to tools', async () => {
      const mockTools: Tool[] = [
        {
          name: 'allowed-tool',
          description: 'This tool should be allowed',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'blocked-tool',
          description: 'This tool should be blocked',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'pattern-tool-test',
          description: 'This tool matches pattern',
          inputSchema: { type: 'object', properties: {} },
        },
      ];

      mockServer.setTools(mockTools);

      const server: BuiltInMCPServer = {
        name: 'filter-server',
        mcpServer: mockServer,
        status: 'activate',
        filters: {
          tools: {
            allow: ['allowed-tool', 'pattern-*'],
            block: ['blocked-tool'],
          },
        },
      };

      client = new MCPClient([server]);
      await client.init();

      const tools = await client.listTools('filter-server');

      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toEqual([
        'allowed-tool',
        'pattern-tool-test',
      ]);
    });

    it('should apply filters with prompts', async () => {
      const mockPrompts = [
        { name: 'allowed-prompt', description: 'Allowed prompt' },
        { name: 'blocked-prompt', description: 'Blocked prompt' },
        { name: 'pattern-prompt-test', description: 'Pattern prompt' },
      ];

      const promptMockServer = new MockMCPServer();
      promptMockServer.setPrompts(mockPrompts);

      const server: BuiltInMCPServer = {
        name: 'filter-prompts-server',
        mcpServer: promptMockServer,
        status: 'activate',
        filters: {
          prompts: {
            allow: ['allowed-prompt', 'pattern-*'],
            block: ['blocked-prompt'],
          },
        },
      };

      client = new MCPClient([server]);
      await client.init();

      const prompts = await client.listPrompts('filter-prompts-server');
      expect(prompts).toHaveLength(2);
      expect(prompts.map((p) => p.name)).toEqual([
        'allowed-prompt',
        'pattern-prompt-test',
      ]);
    });
  });

  describe('Server Configuration Types', () => {
    it('should handle stdio server configuration', () => {
      const stdioServer: StdioMCPServer = {
        name: 'stdio-server',
        command: 'node',
        args: ['server.js'],
        status: 'activate',
        env: { NODE_ENV: 'test' },
        cwd: '/test/path',
      };

      client = new MCPClient([stdioServer]);
      expect(client).toBeInstanceOf(MCPClient);
    });

    it('should handle SSE server configuration', () => {
      const sseServer: SSEMCPServer = {
        name: 'sse-server',
        type: 'sse',
        url: 'http://localhost:3000/sse',
        status: 'activate',
        headers: { Authorization: 'Bearer token' },
      };

      client = new MCPClient([sseServer]);
      expect(client).toBeInstanceOf(MCPClient);
    });

    it('should handle StreamableHTTP server configuration', () => {
      const httpServer: StreamableHTTPMCPServer = {
        name: 'http-server',
        type: 'streamable-http',
        url: 'http://localhost:3000/mcp',
        status: 'activate',
        headers: { 'X-API-Key': 'test-key' },
      };

      client = new MCPClient([httpServer]);
      expect(client).toBeInstanceOf(MCPClient);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      client = new MCPClient([]);
      await client.init();
    });

    it('should emit server-error event on activation failure', async () => {
      const errorHandler = vi.fn();
      client.on('server-error', errorHandler);

      // Create a server that will fail to connect
      const badServer: StdioMCPServer = {
        name: 'bad-server',
        command: 'non-existent-command',
        args: [],
        status: 'activate',
      };

      try {
        await client.addServer(badServer);
      } catch (error) {
        // Expected to fail during addServer because activation fails
      }

      // Wait a bit for async error handling
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorHandler).toHaveBeenCalledWith({
        name: 'bad-server',
        error: expect.any(Error),
      });
    });

    it('should handle server status check', async () => {
      const server: BuiltInMCPServer = {
        name: 'status-check-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      await expect(client.checkServerStatus(server)).resolves.not.toThrow();
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      client = new MCPClient([]);
      await client.init();
    });

    it('should emit server-started event on successful activation', async () => {
      const startedHandler = vi.fn();
      client.on('server-started', startedHandler);

      const server: BuiltInMCPServer = {
        name: 'event-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      await client.addServer(server);

      expect(startedHandler).toHaveBeenCalledWith({ name: 'event-server' });
    });

    it('should emit server-stopped event on deactivation', async () => {
      const stoppedHandler = vi.fn();
      const server: BuiltInMCPServer = {
        name: 'stop-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      await client.addServer(server);

      client.on('server-stopped', stoppedHandler);
      await client.deactivate('stop-server');

      expect(stoppedHandler).toHaveBeenCalledWith({ name: 'stop-server' });
    });
  });

  describe('Timeout Configuration', () => {
    it('should use server-specific timeout over default timeout', async () => {
      const slowMockServer = new MockMCPServer();

      // Setup a tool that takes 150ms to complete
      slowMockServer.setupSlowToolCall('slow-tool', 150);
      slowMockServer.setTools([
        {
          name: 'slow-tool',
          description: 'A slow tool for timeout testing',
          inputSchema: { type: 'object', properties: {} },
        },
      ]);

      const serverWithShortTimeout: BuiltInMCPServer = {
        name: 'short-timeout-server',
        mcpServer: slowMockServer,
        status: 'activate',
        timeout: 0.1, // 100ms - should timeout
      };

      const serverWithLongTimeout: BuiltInMCPServer = {
        name: 'long-timeout-server',
        mcpServer: new MockMCPServer(),
        status: 'activate',
        timeout: 0.3, // 300ms - should succeed
      };

      // Setup the second server with the same slow tool
      (serverWithLongTimeout.mcpServer as MockMCPServer).setupSlowToolCall(
        'slow-tool',
        150,
      );
      (serverWithLongTimeout.mcpServer as MockMCPServer).setTools([
        {
          name: 'slow-tool',
          description: 'A slow tool for timeout testing',
          inputSchema: { type: 'object', properties: {} },
        },
      ]);

      client = new MCPClient([serverWithShortTimeout, serverWithLongTimeout], {
        defaultTimeout: 1,
      });
      await client.init();

      // Test 1: Server with short timeout should fail
      await expect(
        client.callTool({
          client: 'short-timeout-server',
          name: 'slow-tool',
          args: {},
        }),
      ).rejects.toThrow();

      // Test 2: Server with long timeout should succeed
      const result = await client.callTool({
        client: 'long-timeout-server',
        name: 'slow-tool',
        args: {},
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Slow tool result' }],
        isError: false,
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all servers on cleanup call', async () => {
      const server: BuiltInMCPServer = {
        name: 'cleanup-server',
        mcpServer: mockServer,
        status: 'activate',
      };

      client = new MCPClient([server]);
      await client.init();

      // Verify server is active
      const services = await client.listAvailableServices();
      expect(services).toHaveLength(1);

      await client.cleanup();

      // After cleanup, tools should return empty array
      const tools = await client.listTools();
      expect(tools).toHaveLength(0);
    });
  });
});
