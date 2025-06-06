import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { EventSource } from 'eventsource';
import getPort from 'get-port';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, it, describe, beforeAll, afterAll } from 'vitest';

import { startSseAndStreamableHttpMcpServer } from '../src/startServer.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IncomingHttpHeaders } from 'node:http';

if (!('EventSource' in global)) {
  // @ts-expect-error - for Node.js environment
  global.EventSource = EventSource;
}

describe('MCP HTTP Server Tests', () => {
  let port: number;
  let serverEndpoint: { url: string; port: number; close: () => void };
  let headers: IncomingHttpHeaders;

  beforeAll(async () => {
    port = await getPort();
    serverEndpoint = await startSseAndStreamableHttpMcpServer({
      port,
      createMcpServer: async (req) => {
        headers = req.headers;
        const server = new McpServer(
          {
            name: 'test-server',
            version: '1.0.0',
          },
          {
            capabilities: {},
          },
        );

        server.resource(
          'Example Resource',
          'file:///example.txt',
          {
            mimeType: 'text/plain',
          },
          async () => ({
            contents: [
              {
                mimeType: 'text/plain',
                text: 'This is the content of the example resource.',
                uri: 'file:///example.txt',
              },
            ],
          }),
        );

        return server;
      },
    });
  });

  afterAll(async () => {
    serverEndpoint.close();
    await delay(100);
  });

  describe('Headers Tests', () => {
    it('should correctly pass custom headers in StreamableHTTP transport', async () => {
      const customHeaders = {
        'x-custom-header': 'test-value',
        'x-client-id': 'test-client',
        authorization: 'Bearer test-token',
      };

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
        {
          requestInit: {
            headers: customHeaders,
          },
        },
      );

      await client.connect(transport);

      await client.readResource({ uri: 'file:///example.txt' }, {});

      // 验证自定义请求头是否正确传递
      expect(headers['x-custom-header']).toBe(customHeaders['x-custom-header']);
      expect(headers['x-client-id']).toBe(customHeaders['x-client-id']);
      expect(headers['authorization']).toBe(customHeaders['authorization']);

      await client.close();
    });
  });

  describe('StreamableHTTP Transport Tests', () => {
    it('should successfully connect and retrieve resources', async () => {
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

      const resources = await client.listResources();
      expect(resources).toEqual({
        resources: [
          {
            mimeType: 'text/plain',
            name: 'Example Resource',
            uri: 'file:///example.txt',
          },
        ],
      });

      const content = await client.readResource(
        { uri: 'file:///example.txt' },
        {},
      );
      expect(content).toEqual({
        contents: [
          {
            mimeType: 'text/plain',
            text: 'This is the content of the example resource.',
            uri: 'file:///example.txt',
          },
        ],
      });

      await client.close();
    });
  });

  describe('SSE Transport Tests', () => {
    it('should successfully connect and retrieve resources via SSE', async () => {
      const client = new Client(
        {
          name: 'test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const transport = new SSEClientTransport(
        new URL(`http://localhost:${port}/sse`),
      );

      await client.connect(transport);

      const resources = await client.listResources();
      expect(resources).toEqual({
        resources: [
          {
            mimeType: 'text/plain',
            name: 'Example Resource',
            uri: 'file:///example.txt',
          },
        ],
      });

      // 测试读取资源
      const content = await client.readResource(
        { uri: 'file:///example.txt' },
        {},
      );
      expect(content).toEqual({
        contents: [
          {
            mimeType: 'text/plain',
            text: 'This is the content of the example resource.',
            uri: 'file:///example.txt',
          },
        ],
      });

      await client.close();
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid JSON requests properly', async () => {
      const response = await fetch(`${serverEndpoint.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error).toHaveProperty('jsonrpc', '2.0');
      expect(error).toHaveProperty('error.code');
      expect(error).toHaveProperty('error.message');
    });

    it('should reject GET requests to /mcp endpoint', async () => {
      const response = await fetch(`${serverEndpoint.url}`, {
        method: 'GET',
      });

      expect(response.status).toBe(405);
      const error = await response.json();
      expect(error).toHaveProperty('jsonrpc', '2.0');
      expect(error).toHaveProperty('error.code');
      expect(error.error.message).toBe('Method not allowed.');
    });

    it('should reject DELETE requests to /mcp endpoint', async () => {
      const response = await fetch(`${serverEndpoint.url}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(405);
      const error = await response.json();
      expect(error).toHaveProperty('jsonrpc', '2.0');
      expect(error).toHaveProperty('error.code');
      expect(error.error.message).toBe('Method not allowed.');
    });
  });
});
