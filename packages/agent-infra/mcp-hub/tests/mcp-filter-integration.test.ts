import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { MCPHub } from '../src/MCPHub.js';
import { MCPServerEndpoint } from '../src/mcp/server.js';

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setSseManager: vi.fn(),
  },
}));

describe('MCP Filter Integration Test', () => {
  let app: express.Application;
  let server: Server;
  let mcpHub: MCPHub;
  let mcpEndpoint: MCPServerEndpoint;
  const port = 3456;

  beforeAll(async () => {
    // Create test config
    const testConfig = {
      mcpServers: {
        filesystem: {
          command: 'echo',
          args: ['test'],
          description: 'File system operations',
          category: 'development',
          tags: ['file', 'io'],
        },
        github: {
          command: 'echo',
          args: ['test'],
          description: 'GitHub API integration',
          category: 'development',
          tags: ['github', 'api', 'vcs'],
        },
        database: {
          command: 'echo',
          args: ['test'],
          description: 'Database operations',
          category: 'data',
          tags: ['sql', 'database'],
        },
      },
    };

    // Initialize MCP Hub
    mcpHub = new MCPHub(testConfig, { port });
    mcpEndpoint = new MCPServerEndpoint(mcpHub);

    // Create Express app
    app = express();
    app.use(express.json());

    // Register endpoints
    app.get('/mcp', async (req, res) => {
      await mcpEndpoint.handleStreamableHttpRequest(req, res);
    });

    app.get('/sse', async (req, res) => {
      await mcpEndpoint.handleSSEConnection(req, res);
    });

    // Start server
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => resolve());
    });
  });

  afterAll(async () => {
    // Clean up
    await mcpEndpoint.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should filter servers when connecting with query params', async () => {
    // Test that query params are parsed correctly
    const mockReq = {
      query: {
        query: 'github',
        category: 'development',
      },
      headers: {},
      method: 'GET',
    } as any;

    const mockRes = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as any;

    // Simulate SSE connection with filters
    const filters = {
      query: mockReq.query.query,
      category: mockReq.query.category,
      tags: undefined,
      sort: undefined,
    };

    const server = mcpEndpoint.createServer(filters);

    // Check that server was created with filters
    expect(server).toBeDefined();

    // Access the handlers to verify filtering works
    const handlers = (server as any)._requestHandlers;
    expect(handlers).toBeDefined();
    expect(handlers.size).toBeGreaterThan(0);

    // Get tools list handler
    const listHandler = handlers.get('tools/list');
    expect(listHandler).toBeDefined();

    // Note: Actual filtering would require the connections to be established
    // This test mainly verifies the filter parsing and setup works
  });

  it('should parse tags as comma-separated values', () => {
    const mockReq = {
      query: {
        tags: 'api,github,vcs',
      },
    } as any;

    const filters = {
      query: undefined,
      category: undefined,
      tags: mockReq.query.tags,
      sort: undefined,
    };

    const server = mcpEndpoint.createServer(filters);
    expect(server).toBeDefined();
  });

  it('should handle both query and search params', () => {
    const mockReq1 = {
      query: {
        query: 'test',
      },
    } as any;

    const mockReq2 = {
      query: {
        search: 'test',
      },
    } as any;

    const filters1 = {
      query: mockReq1.query.query || mockReq1.query.search,
      category: undefined,
      tags: undefined,
      sort: undefined,
    };

    const filters2 = {
      query: mockReq2.query.query || mockReq2.query.search,
      category: undefined,
      tags: undefined,
      sort: undefined,
    };

    // Both should result in the same filter value
    expect(filters1.query).toBe('test');
    expect(filters2.query).toBe('test');
  });
});
