import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPServerEndpoint } from '../src/mcp/server.js';
import { MCPHub } from '../src/MCPHub.js';
import { MCPConnection } from '../src/MCPConnection.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Helper to get request handler from server
function getHandler(server: Server, method: string) {
  const handlers = (server as any)._requestHandlers;
  return handlers.get(method);
}

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MCP Server Filtering', () => {
  let mcpHub: MCPHub;
  let mcpEndpoint: MCPServerEndpoint;

  beforeEach(() => {
    // Create mock MCPHub with test connections
    mcpHub = new MCPHub({}, {});
    mcpHub.hubServerUrl = 'http://localhost:3000';

    // Create mock connections with different metadata
    const mockConnections = new Map<string, MCPConnection>();

    // Mock filesystem server
    const fsConnection = {
      name: 'filesystem',
      status: 'connected',
      disabled: false,
      config: {
        description: 'File system operations',
        category: 'development',
        tags: ['file', 'io'],
      },
      tools: [
        { name: 'read_file', description: 'Read file contents' },
        { name: 'write_file', description: 'Write file contents' },
      ],
      resources: [],
      prompts: [],
    } as any;
    mockConnections.set('filesystem', fsConnection);

    // Mock GitHub server
    const githubConnection = {
      name: 'github',
      status: 'connected',
      disabled: false,
      config: {
        description: 'GitHub API integration',
        category: 'development',
        tags: ['github', 'api', 'vcs'],
      },
      tools: [
        { name: 'create_issue', description: 'Create GitHub issue' },
        { name: 'list_repos', description: 'List repositories' },
      ],
      resources: [],
      prompts: [],
    } as any;
    mockConnections.set('github', githubConnection);

    // Mock database server
    const dbConnection = {
      name: 'database',
      status: 'connected',
      disabled: false,
      config: {
        description: 'Database operations',
        category: 'data',
        tags: ['sql', 'database'],
      },
      tools: [
        { name: 'query', description: 'Execute SQL query' },
        { name: 'migrate', description: 'Run database migrations' },
      ],
      resources: [],
      prompts: [],
    } as any;
    mockConnections.set('database', dbConnection);

    // Mock simple server without metadata
    const simpleConnection = {
      name: 'simple',
      status: 'connected',
      disabled: false,
      config: {},
      tools: [{ name: 'hello', description: 'Say hello' }],
      resources: [],
      prompts: [],
    } as any;
    mockConnections.set('simple', simpleConnection);

    mcpHub.connections = mockConnections;

    // Create MCP endpoint
    mcpEndpoint = new MCPServerEndpoint(mcpHub);

    // Register capabilities from all connections
    mcpEndpoint.syncCapabilities();
  });

  describe('Filter by query/search', () => {
    it('should filter tools by server name matching query', async () => {
      const server = mcpEndpoint.createServer({ query: 'file' });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Should only include tools from filesystem server
      expect(result.tools).toHaveLength(2);
      expect(result.tools.map((t: any) => t.name)).toEqual(
        expect.arrayContaining(['read_file', 'write_file']),
      );
    });

    it('should filter tools by server description matching query', async () => {
      const server = mcpEndpoint.createServer({ query: 'github api' });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Should only include tools from github server
      expect(result.tools).toHaveLength(2);
      expect(result.tools.map((t: any) => t.name)).toEqual(
        expect.arrayContaining(['create_issue', 'list_repos']),
      );
    });

    it('should return empty list when query matches no servers', async () => {
      const server = mcpEndpoint.createServer({ query: 'nonexistent' });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      expect(result.tools).toHaveLength(0);
    });
  });

  describe('Filter by category', () => {
    it('should filter tools by server category', async () => {
      const server = mcpEndpoint.createServer({ category: 'development' });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Should include tools from filesystem and github servers (both development category)
      expect(result.tools).toHaveLength(4);
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toEqual(
        expect.arrayContaining([
          'read_file',
          'write_file',
          'create_issue',
          'list_repos',
        ]),
      );
    });

    it('should filter to only data category', async () => {
      const server = mcpEndpoint.createServer({ category: 'data' });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Should only include tools from database server
      expect(result.tools).toHaveLength(2);
      expect(result.tools.map((t: any) => t.name)).toEqual(
        expect.arrayContaining(['query', 'migrate']),
      );
    });

    it('should exclude servers without category metadata', async () => {
      const server = mcpEndpoint.createServer({ category: 'other' });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Simple server has no category, so should be excluded
      expect(result.tools).toHaveLength(0);
    });
  });

  describe('Filter by tags', () => {
    it('should filter tools by single tag', async () => {
      const server = mcpEndpoint.createServer({ tags: 'github' });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Should only include tools from github server
      expect(result.tools).toHaveLength(2);
      expect(result.tools.map((t: any) => t.name)).toEqual(
        expect.arrayContaining(['create_issue', 'list_repos']),
      );
    });

    it('should filter tools by multiple tags (AND logic)', async () => {
      const server = mcpEndpoint.createServer({ tags: 'file,io' });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Should only include tools from filesystem server (has both tags)
      expect(result.tools).toHaveLength(2);
      expect(result.tools.map((t: any) => t.name)).toEqual(
        expect.arrayContaining(['read_file', 'write_file']),
      );
    });

    it('should return empty when tags dont match', async () => {
      const server = mcpEndpoint.createServer({ tags: 'nonexistent,tag' });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      expect(result.tools).toHaveLength(0);
    });
  });

  describe('Combined filters', () => {
    it('should apply query and category filters together', async () => {
      const server = mcpEndpoint.createServer({
        query: 'file',
        category: 'development',
      });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Only filesystem matches both criteria
      expect(result.tools).toHaveLength(2);
      expect(result.tools.map((t: any) => t.name)).toEqual(
        expect.arrayContaining(['read_file', 'write_file']),
      );
    });

    it('should apply query and tags filters together', async () => {
      const server = mcpEndpoint.createServer({
        query: 'github',
        tags: 'api',
      });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Only github server matches both
      expect(result.tools).toHaveLength(2);
      expect(result.tools.map((t: any) => t.name)).toEqual(
        expect.arrayContaining(['create_issue', 'list_repos']),
      );
    });

    it('should return empty when combined filters match nothing', async () => {
      const server = mcpEndpoint.createServer({
        category: 'development',
        tags: 'sql',
      });
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // No server is development category with sql tag
      expect(result.tools).toHaveLength(0);
    });
  });

  describe('No filters', () => {
    it('should return all tools when no filters provided', async () => {
      const server = mcpEndpoint.createServer();
      const listHandler = getHandler(server, 'tools/list');
      const result = await listHandler(
        { method: 'tools/list', params: {} },
        {},
      );

      // Should include all tools from all servers
      expect(result.tools).toHaveLength(7);
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toEqual(
        expect.arrayContaining([
          'read_file',
          'write_file',
          'create_issue',
          'list_repos',
          'query',
          'migrate',
          'hello',
        ]),
      );
    });
  });

  describe('Resources filtering', () => {
    it('should filter resources same as tools', async () => {
      // Add some test resources
      (mcpHub.connections.get('filesystem') as any).resources = [
        { uri: 'file:///test.txt', name: 'Test file' },
      ];
      (mcpHub.connections.get('github') as any).resources = [
        { uri: 'github://repo/readme', name: 'README' },
      ];

      // Re-sync capabilities
      mcpEndpoint.syncCapabilities();

      const server = mcpEndpoint.createServer({ category: 'development' });
      const listHandler = getHandler(server, 'resources/list');
      const result = await listHandler(
        { method: 'resources/list', params: {} },
        {},
      );

      // Should include resources from development category servers only
      expect(result.resources).toHaveLength(2);
    });
  });

  describe('Prompts filtering', () => {
    it('should filter prompts same as tools', async () => {
      // Add some test prompts
      (mcpHub.connections.get('filesystem') as any).prompts = [
        { name: 'analyze_code', description: 'Analyze code files' },
      ];
      (mcpHub.connections.get('database') as any).prompts = [
        { name: 'optimize_query', description: 'Optimize SQL query' },
      ];

      // Re-sync capabilities
      mcpEndpoint.syncCapabilities();

      const server = mcpEndpoint.createServer({ tags: 'sql' });
      const listHandler = getHandler(server, 'prompts/list');
      const result = await listHandler(
        { method: 'prompts/list', params: {} },
        {},
      );

      // Should only include prompts from database server
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('optimize_query');
    });
  });
});
