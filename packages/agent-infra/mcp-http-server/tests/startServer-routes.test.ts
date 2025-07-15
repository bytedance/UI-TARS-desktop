import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { EventSource } from 'eventsource';
import getPort from 'get-port';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, it, describe, beforeAll, afterAll } from 'vitest';

import { startSseAndStreamableHttpMcpServer } from '../src/startServer.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

if (!('EventSource' in global)) {
  // @ts-expect-error - for Node.js environment
  global.EventSource = EventSource;
}

// Helper function to extract path from URL for testing
function extractPath(url: string): string {
  return new URL(url).pathname;
}

// Helper function to extract port from URL for testing
function extractPort(url: string): number {
  return parseInt(new URL(url).port);
}

describe('MCP Server Routes Configuration Tests', () => {
  describe('Default Routes', () => {
    let port: number;
    let serverEndpoint: {
      url: string;
      sseUrl: string;
      port: number;
      close: () => void;
    };

    beforeAll(async () => {
      port = await getPort();
      serverEndpoint = await startSseAndStreamableHttpMcpServer({
        port,
        host: 'localhost',
        createMcpServer: async () => {
          const server = new Server(
            {
              name: 'test-server',
              version: '1.0.0',
            },
            {
              capabilities: {
                prompts: {},
              },
            },
          );

          server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return {
              prompts: [
                {
                  name: 'example-prompt',
                  description: 'An example prompt template',
                  arguments: [
                    {
                      name: 'arg1',
                      description: 'Example argument',
                      required: true,
                    },
                  ],
                },
              ],
            };
          });

          return server;
        },
      });
    });

    afterAll(async () => {
      serverEndpoint.close();
      await delay(100);
    });

    it('should use default routes when no configuration is provided', async () => {
      expect(extractPath(serverEndpoint.url)).toBe('/mcp');
      expect(extractPath(serverEndpoint.sseUrl)).toBe('/sse');
      expect(extractPort(serverEndpoint.url)).toBe(port);
      expect(extractPort(serverEndpoint.sseUrl)).toBe(port);

      // Test MCP endpoint
      const client = new Client(
        {
          name: 'test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const transport = new StreamableHTTPClientTransport(
        new URL(serverEndpoint.url),
      );

      await client.connect(transport);
      const prompts = await client.listPrompts();
      expect(prompts.prompts).toHaveLength(1);
      await client.close();
    });

    it('should handle SSE connection with default routes', async () => {
      const client = new Client(
        {
          name: 'test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const transport = new SSEClientTransport(new URL(serverEndpoint.sseUrl));

      await client.connect(transport);
      const prompts = await client.listPrompts();
      expect(prompts.prompts).toHaveLength(1);
      await client.close();
    });
  });

  describe('Custom Routes', () => {
    let port: number;
    let serverEndpoint: {
      url: string;
      sseUrl: string;
      port: number;
      close: () => void;
    };

    beforeAll(async () => {
      port = await getPort();
      serverEndpoint = await startSseAndStreamableHttpMcpServer({
        port,
        host: 'localhost',
        routes: {
          prefix: '/api/v1',
          mcp: '/custom-mcp',
          message: '/custom-message',
          sse: '/custom-sse',
        },
        createMcpServer: async () => {
          const server = new Server(
            {
              name: 'test-server',
              version: '1.0.0',
            },
            {
              capabilities: {
                prompts: {},
              },
            },
          );

          server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return {
              prompts: [
                {
                  name: 'custom-prompt',
                  description: 'A custom prompt template',
                  arguments: [],
                },
              ],
            };
          });

          return server;
        },
      });
    });

    afterAll(async () => {
      serverEndpoint.close();
      await delay(100);
    });

    it('should use custom routes configuration', async () => {
      expect(extractPath(serverEndpoint.url)).toBe('/api/v1/custom-mcp');
      expect(extractPath(serverEndpoint.sseUrl)).toBe('/api/v1/custom-sse');
      expect(extractPort(serverEndpoint.url)).toBe(port);
      expect(extractPort(serverEndpoint.sseUrl)).toBe(port);

      const client = new Client(
        {
          name: 'test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const transport = new StreamableHTTPClientTransport(
        new URL(serverEndpoint.url),
      );

      await client.connect(transport);
      const prompts = await client.listPrompts();
      expect(prompts.prompts).toHaveLength(1);
      expect(prompts.prompts[0].name).toBe('custom-prompt');
      await client.close();
    });

    it('should handle SSE connection with custom routes', async () => {
      const client = new Client(
        {
          name: 'test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const transport = new SSEClientTransport(new URL(serverEndpoint.sseUrl));

      await client.connect(transport);
      const prompts = await client.listPrompts();
      expect(prompts.prompts).toHaveLength(1);
      expect(prompts.prompts[0].name).toBe('custom-prompt');
      await client.close();
    });

    it('should reject requests to default routes when custom routes are configured', async () => {
      const baseUrl = serverEndpoint.url.replace('/api/v1/custom-mcp', '');
      const defaultMcpUrl = `${baseUrl}/mcp`;

      const defaultMcpResponse = await fetch(defaultMcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {},
          id: 1,
        }),
      });

      expect(defaultMcpResponse.status).toBe(404);
    });
  });

  describe('Partial Route Configuration', () => {
    let port: number;
    let serverEndpoint: {
      url: string;
      sseUrl: string;
      port: number;
      close: () => void;
    };

    beforeAll(async () => {
      port = await getPort();
      serverEndpoint = await startSseAndStreamableHttpMcpServer({
        port,
        host: 'localhost',
        routes: {
          prefix: '/api',
          mcp: '/custom-mcp',
        },
        createMcpServer: async () => {
          const server = new Server(
            {
              name: 'test-server',
              version: '1.0.0',
            },
            {
              capabilities: {
                prompts: {},
              },
            },
          );

          server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return {
              prompts: [
                {
                  name: 'partial-config-prompt',
                  description: 'A prompt with partial config',
                  arguments: [],
                },
              ],
            };
          });

          return server;
        },
      });
    });

    afterAll(async () => {
      serverEndpoint.close();
      await delay(100);
    });

    it('should mix custom and default route values', async () => {
      // 验证路径
      expect(extractPath(serverEndpoint.url)).toBe('/api/custom-mcp');
      expect(extractPath(serverEndpoint.sseUrl)).toBe('/api/sse');
      expect(extractPort(serverEndpoint.url)).toBe(port);

      // Test MCP endpoint
      const client = new Client(
        {
          name: 'test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const transport = new StreamableHTTPClientTransport(
        new URL(serverEndpoint.url),
      );

      await client.connect(transport);
      const prompts = await client.listPrompts();
      expect(prompts.prompts).toHaveLength(1);
      expect(prompts.prompts[0].name).toBe('partial-config-prompt');
      await client.close();
    });
  });

  describe('Edge Cases', () => {
    it('should handle routes with trailing/leading slashes correctly', async () => {
      const port = await getPort();
      const serverEndpoint = await startSseAndStreamableHttpMcpServer({
        port,
        host: 'localhost',
        routes: {
          prefix: '/api/v2/', // trailing slash
          mcp: 'mcp-endpoint', // no leading slash
          sse: '/sse-endpoint/', // both slashes
        },
        createMcpServer: async () => {
          const server = new Server(
            {
              name: 'test-server',
              version: '1.0.0',
            },
            {
              capabilities: {
                prompts: {},
              },
            },
          );

          server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return { prompts: [] };
          });

          return server;
        },
      });

      try {
        expect(extractPath(serverEndpoint.url)).toBe('/api/v2/mcp-endpoint');
        expect(extractPath(serverEndpoint.sseUrl)).toBe(
          '/api/v2/sse-endpoint/',
        );
        expect(extractPort(serverEndpoint.url)).toBe(port);

        const response = await fetch(serverEndpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test', version: '1.0.0' },
            },
            id: 1,
          }),
        });

        console.log('Response status:', response.status);
        if (response.status !== 200) {
          const responseText = await response.text();
          console.log('Response body:', responseText);
        }

        expect(response.status).toBe(200);
      } finally {
        serverEndpoint.close();
        await delay(100);
      }
    });

    it('should handle root prefix correctly', async () => {
      const port = await getPort();
      const serverEndpoint = await startSseAndStreamableHttpMcpServer({
        port,
        host: 'localhost',
        routes: {
          prefix: '/',
          mcp: '/mcp',
        },
        createMcpServer: async () => {
          const server = new Server(
            {
              name: 'test-server',
              version: '1.0.0',
            },
            {
              capabilities: {
                prompts: {},
              },
            },
          );

          server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return { prompts: [] };
          });

          return server;
        },
      });

      try {
        expect(extractPath(serverEndpoint.url)).toBe('/mcp');
        expect(extractPath(serverEndpoint.sseUrl)).toBe('/sse');
        expect(extractPort(serverEndpoint.url)).toBe(port);
      } finally {
        serverEndpoint.close();
        await delay(100);
      }
    });
  });
});
