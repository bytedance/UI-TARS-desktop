import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { EventSource } from 'eventsource';
import getPort from 'get-port';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, it, describe, beforeAll, afterAll } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

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

  describe('Custom Middleware Tests', () => {
    let customMiddlewareServerEndpoint: {
      url: string;
      port: number;
      close: () => void;
    };
    let customMiddlewarePort: number;

    beforeAll(async () => {
      customMiddlewarePort = await getPort();

      // 创建自定义中间件
      const requestTrackingMiddleware = (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        res.setHeader('X-Request-ID', Math.random().toString(36).substring(7));
        res.setHeader('X-Custom-Middleware', 'active');
        next();
      };

      const loggingMiddleware = (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        res.setHeader('X-Request-Path', req.path);
        res.setHeader('X-Request-Method', req.method);
        next();
      };

      const healthCheckMiddleware = (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        if (req.path === '/health') {
          res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            middleware: 'active',
          });
          return;
        }
        next();
      };

      customMiddlewareServerEndpoint = await startSseAndStreamableHttpMcpServer(
        {
          port: customMiddlewarePort,
          middlewares: [
            requestTrackingMiddleware,
            loggingMiddleware,
            healthCheckMiddleware,
          ],
          createMcpServer: async () => {
            const server = new Server(
              {
                name: 'test-server-with-middleware',
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
                    name: 'middleware-test-prompt',
                    description: 'A test prompt for middleware testing',
                    arguments: [],
                  },
                ],
              };
            });

            return server;
          },
        },
      );
    });

    afterAll(async () => {
      customMiddlewareServerEndpoint.close();
      await delay(100);
    });

    it('should apply custom middlewares and add custom headers', async () => {
      const client = new Client(
        {
          name: 'test-client-middleware',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      const transport = new StreamableHTTPClientTransport(
        new URL(customMiddlewareServerEndpoint.url),
      );

      await client.connect(transport);

      // 发送请求并检查自定义头部
      const prompts = await client.listPrompts();
      expect(prompts).toEqual({
        prompts: [
          {
            name: 'middleware-test-prompt',
            description: 'A test prompt for middleware testing',
            arguments: [],
          },
        ],
      });

      await client.close();

      // 直接测试 HTTP 响应头
      const response = await fetch(`${customMiddlewareServerEndpoint.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'prompts/list',
        }),
      });

      // 验证自定义中间件添加的头部
      expect(response.headers.get('X-Custom-Middleware')).toBe('active');
      expect(response.headers.get('X-Request-ID')).toBeTruthy();
      expect(response.headers.get('X-Request-Path')).toBe('/mcp');
      expect(response.headers.get('X-Request-Method')).toBe('POST');
    });

    it('should handle health check endpoint via custom middleware', async () => {
      const response = await fetch(
        `http://localhost:${customMiddlewarePort}/health`,
      );

      expect(response.status).toBe(200);

      const healthData = await response.json();
      expect(healthData).toHaveProperty('status', 'ok');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('middleware', 'active');

      // 验证健康检查也有自定义头部
      expect(response.headers.get('X-Custom-Middleware')).toBe('active');
      expect(response.headers.get('X-Request-Path')).toBe('/health');
      expect(response.headers.get('X-Request-Method')).toBe('GET');
    });

    it('should execute middlewares in correct order', async () => {
      const executionOrder: string[] = [];
      const middlewarePort = await getPort();

      // 创建多个中间件来测试执行顺序
      const firstMiddleware = (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        executionOrder.push('first');
        res.setHeader('X-First', 'executed');
        next();
      };

      const secondMiddleware = (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        executionOrder.push('second');
        res.setHeader('X-Second', 'executed');
        next();
      };

      const thirdMiddleware = (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        executionOrder.push('third');
        res.setHeader('X-Third', 'executed');
        next();
      };

      const orderTestServer = await startSseAndStreamableHttpMcpServer({
        port: middlewarePort,
        middlewares: [firstMiddleware, secondMiddleware, thirdMiddleware],
        createMcpServer: async () => {
          const server = new Server(
            { name: 'order-test-server', version: '1.0.0' },
            { capabilities: { prompts: {} } },
          );

          server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return { prompts: [] };
          });

          return server;
        },
      });

      try {
        const response = await fetch(`http://localhost:${middlewarePort}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'prompts/list',
          }),
        });

        expect(response.headers.get('X-First')).toBe('executed');
        expect(response.headers.get('X-Second')).toBe('executed');
        expect(response.headers.get('X-Third')).toBe('executed');

        expect(executionOrder).toEqual(['first', 'second', 'third']);
      } finally {
        orderTestServer.close();
        await delay(100);
      }
    });
  });

  describe('MCP Session ID Tests', () => {
    it('should ignore mcp-session-id in stateless mode', async () => {
      const client = new Client(
        {
          name: 'test-stateless-client',
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
            headers: {
              'mcp-session-id': 'should-be-ignored',
            },
          },
        },
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

      await client.close();
    });

    it('should require valid session ID in stateful mode', async () => {
      const statefulTestPort = await getPort();

      const statefulTestServer = await startSseAndStreamableHttpMcpServer({
        port: statefulTestPort,
        stateless: false,
        createMcpServer: async () => {
          const server = new Server(
            {
              name: 'test-stateful-validation-server',
              version: '1.0.0',
            },
            {
              capabilities: { prompts: {} },
            },
          );

          server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return { prompts: [] };
          });

          return server;
        },
      });

      try {
        const response = await fetch(
          `http://localhost:${statefulTestPort}/mcp`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'prompts/list',
            }),
          },
        );

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.error.message).toBe(
          'Bad Request: No valid session ID provided',
        );
      } finally {
        statefulTestServer.close();
        await delay(100);
      }
    });
  });
});
