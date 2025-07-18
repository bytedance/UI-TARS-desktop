/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  ErrorCode,
  isInitializeRequest,
  type JSONRPCError,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger, ConsoleLogger, BaseLogger } from '@agent-infra/logger';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { AddressInfo } from 'node:net';

export { BaseLogger };

export interface RoutesConfig {
  /** Route prefix for all endpoints. Default is '/' */
  prefix?: string;
  /** MCP endpoint path. Default is '/mcp', really means '/${prefix}/mcp' */
  mcp?: string;
  /** Message endpoint path for SSE. Default is '/message', really means '/${prefix}/message' */
  message?: string;
  /** SSE endpoint path. Default is '/sse', really means '/${prefix}/sse' */
  sse?: string;
}

export interface McpServerEndpoint {
  url: string;
  sseUrl: string;
  port: number;
  close: () => void;
}

export interface RequestContext extends Pick<Request, 'headers'> {}

export type MiddlewareFunction = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

interface StartSseAndStreamableHttpMcpServerParams {
  port?: number;
  host?: string;
  /** Enable stateless mode for streamable http transports. Default is True */
  stateless?: boolean;
  /** Custom middlewares */
  middlewares?: MiddlewareFunction[];
  /** Routes configuration */
  routes?: RoutesConfig;
  logger?: Logger;
  createMcpServer: (req: RequestContext) => Promise<McpServer | Server>;
}

export async function startSseAndStreamableHttpMcpServer(
  params: StartSseAndStreamableHttpMcpServerParams,
): Promise<McpServerEndpoint> {
  const {
    port,
    host,
    createMcpServer,
    stateless = true,
    middlewares,
    routes = {},
    logger = new ConsoleLogger(),
  } = params;

  // default routes config
  const routesConfig = {
    prefix: routes.prefix || '/',
    mcp: routes.mcp || '/mcp',
    message: routes.message || '/message',
    sse: routes.sse || '/sse',
  };

  // helper function to build full path
  const buildPath = (routePath: string) => {
    const prefix = routesConfig.prefix.endsWith('/')
      ? routesConfig.prefix.slice(0, -1)
      : routesConfig.prefix;
    const normalizedPath = routePath.startsWith('/')
      ? routePath
      : `/${routePath}`;
    return prefix === '/' ? normalizedPath : `${prefix}${normalizedPath}`;
  };

  const transports = {
    streamable: new Map<string, StreamableHTTPServerTransport>(),
    sse: new Map<string, SSEServerTransport>(),
  };

  const app = express();
  app.use(express.json());

  app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (
      err instanceof SyntaxError &&
      (err as any)?.status === 400 &&
      'body' in err
    ) {
      res.status(400).send({
        jsonrpc: '2.0',
        error: { code: ErrorCode.ParseError, message: err.message },
      } as JSONRPCError); // Bad request
      return;
    }
    next();
  });

  if (middlewares) {
    middlewares.forEach((middleware) => app.use(middleware));
  }

  // SSE endpoint
  app.get(buildPath(routesConfig.sse), async (req, res) => {
    const mcpServer = await createMcpServer({
      headers: req.headers,
    });
    logger.info(`New SSE connection from ${req.ip}`);

    const sseTransport = new SSEServerTransport(
      buildPath(routesConfig.message),
      res,
    );

    transports.sse.set(sseTransport.sessionId, sseTransport);

    res.on('close', () => {
      transports.sse.delete(sseTransport.sessionId);
    });

    await mcpServer.connect(sseTransport);
  });

  // Message endpoint for SSE
  app.post(buildPath(routesConfig.message), async (req, res) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    const transport = transports.sse.get(sessionId);

    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      res.status(400).send('No transport found for sessionId');
    }
  });

  // MCP HTTP endpoint
  app.post(buildPath(routesConfig.mcp), async (req: Request, res: Response) => {
    const mcpServer = await createMcpServer({
      headers: req.headers,
    });

    let transport: StreamableHTTPServerTransport;

    if (stateless) {
      transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
        sessionIdGenerator: undefined, // set to undefined for stateless servers
      });
    } else {
      const sessionId = Array.isArray(req.headers['mcp-session-id'])
        ? req.headers['mcp-session-id'][0]
        : req.headers['mcp-session-id'];

      if (sessionId && transports.streamable.has(sessionId)) {
        // Reuse existing transport
        transport = transports.streamable.get(sessionId)!;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            // Store the transport by session ID
            transports.streamable.set(sessionId, transport!);
          },
        });

        // Clean up transport when closed
        transport.onclose = () => {
          if (transport?.sessionId) {
            transports.streamable.delete(transport.sessionId);
          }
        };
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: ErrorCode.ConnectionClosed,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }
    }

    // Setup routes for the server
    await mcpServer.connect(transport);

    logger.log('Received MCP request:', req.body);
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: ErrorCode.InternalError,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Handle GET requests to MCP endpoint
  app.get(buildPath(routesConfig.mcp), async (req: Request, res: Response) => {
    logger.info('Received GET MCP request');
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: ErrorCode.ConnectionClosed,
          message: 'Method not allowed.',
        },
        id: null,
      }),
    );
  });

  // Handle DELETE requests to MCP endpoint
  app.delete(
    buildPath(routesConfig.mcp),
    async (req: Request, res: Response) => {
      logger.info('Received DELETE MCP request');
      res.writeHead(405).end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: ErrorCode.ConnectionClosed,
            message: 'Method not allowed.',
          },
          id: null,
        }),
      );
    },
  );

  const HOST = host || '::';
  const PORT = Number(port || process.env.PORT || 8080);

  return new Promise((resolve, reject) => {
    const appServer = app.listen(PORT, HOST, (error?: Error) => {
      if (error) {
        logger.error('Failed to start server:', error);
        reject(error);
        return;
      }
      const address = appServer.address() as AddressInfo;
      const actualHost =
        (address?.family === 'IPv6'
          ? `[${address.address}]`
          : address?.address) || HOST;

      const endpoint: McpServerEndpoint = {
        url: `http://${actualHost}:${PORT}${buildPath(routesConfig.mcp)}`,
        sseUrl: `http://${actualHost}:${PORT}${buildPath(routesConfig.sse)}`,
        port: PORT,
        close: () => appServer.close(),
      };
      logger.info(`Streamable HTTP MCP Server listening at ${endpoint.url}`);
      logger.info(`SSE MCP Server listening at ${endpoint.sseUrl}`);
      resolve(endpoint);
    });

    // Handle server errors
    appServer.on('error', (error: Error) => {
      logger.error('Server error:', error);
      reject(error);
    });
  });
}
