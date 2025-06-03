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

describe('MCP Server HTTP Server Tests', () => {
  let port: number;
  let serverEndpoint: { url: string; port: number; close: () => void };

  beforeAll(async () => {
    port = await getPort();
    serverEndpoint = await startSseAndStreamableHttpMcpServer({
      port,
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

        server.setRequestHandler(GetPromptRequestSchema, async (request) => {
          if (request.params.name !== 'example-prompt') {
            throw new Error('Unknown prompt');
          }
          return {
            description: 'An example prompt template',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: 'Example prompt text',
                },
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

  describe('StreamableHTTP Transport Tests', () => {
    it('should successfully connect and retrieve prompts', async () => {
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
      expect(prompts).toEqual({
        prompts: [
          {
            name: 'example-prompt',
            description: 'An example prompt template',
            arguments: [
              { name: 'arg1', description: 'Example argument', required: true },
            ],
          },
        ],
      });

      const prompt = await client.getPrompt({ name: 'example-prompt' });
      expect(prompt).toEqual({
        description: 'An example prompt template',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Example prompt text',
            },
          },
        ],
      });

      await client.close();
    });
  });

  describe('SSE Transport Tests', () => {
    it('should successfully connect and retrieve prompts via SSE', async () => {
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

      const prompts = await client.listPrompts();
      expect(prompts).toEqual({
        prompts: [
          {
            name: 'example-prompt',
            description: 'An example prompt template',
            arguments: [
              { name: 'arg1', description: 'Example argument', required: true },
            ],
          },
        ],
      });

      const prompt = await client.getPrompt({ name: 'example-prompt' });
      expect(prompt).toEqual({
        description: 'An example prompt template',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Example prompt text',
            },
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
