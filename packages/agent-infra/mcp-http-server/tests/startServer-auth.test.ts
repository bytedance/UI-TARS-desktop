import getPort from 'get-port';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, it, describe, beforeAll, afterAll } from 'vitest';

import { startSseAndStreamableHttpMcpServer } from '../src/startServer.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Tests for the built-in API key (Bearer token) authentication.
 *
 * The API key can be provided either via the `apiKey` param or via the
 * `MCP_API_KEY` environment variable. When set, every request must include
 * a matching `Authorization: Bearer <apiKey>` header.
 */
describe('MCP HTTP Server API Key Authentication Tests', () => {
  const API_KEY = 'super-secret-test-key';
  let port: number;
  let serverEndpoint: { url: string; port: number; close: () => void };

  beforeAll(async () => {
    port = await getPort();
    serverEndpoint = await startSseAndStreamableHttpMcpServer({
      port,
      apiKey: API_KEY,
      createMcpServer: async () => {
        return new McpServer(
          {
            name: 'auth-test-server',
            version: '1.0.0',
          },
          {
            capabilities: {},
          },
        );
      },
    });
  });

  afterAll(async () => {
    serverEndpoint.close();
    await delay(100);
  });

  it('should reject requests without an Authorization header (401)', async () => {
    const response = await fetch(serverEndpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('Bearer');

    const error = await response.json();
    expect(error).toHaveProperty('jsonrpc', '2.0');
    expect(error).toHaveProperty('error.code');
    expect(error.error.message).toContain('Unauthorized');
  });

  it('should reject requests with an invalid Bearer token (401)', async () => {
    const response = await fetch(serverEndpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-token',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    });

    expect(response.status).toBe(401);
    const error = await response.json();
    expect(error.error.message).toContain('invalid API key');
  });

  it('should accept requests with a valid Bearer token', async () => {
    const response = await fetch(serverEndpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    });

    // Authenticated request should reach the MCP server (200), not be
    // blocked by the auth middleware (401).
    expect(response.status).toBe(200);
  });

  it('should reject unauthenticated GET requests to the SSE endpoint (401)', async () => {
    const response = await fetch(`http://localhost:${port}/sse`);
    expect(response.status).toBe(401);
  });
});

describe('MCP HTTP Server without API Key (backward compatibility)', () => {
  let port: number;
  let serverEndpoint: { url: string; port: number; close: () => void };
  const originalEnv = process.env.MCP_API_KEY;

  beforeAll(async () => {
    // Make sure no API key is configured for this suite.
    delete process.env.MCP_API_KEY;

    port = await getPort();
    serverEndpoint = await startSseAndStreamableHttpMcpServer({
      port,
      createMcpServer: async () => {
        return new McpServer(
          {
            name: 'no-auth-test-server',
            version: '1.0.0',
          },
          {
            capabilities: {},
          },
        );
      },
    });
  });

  afterAll(async () => {
    serverEndpoint.close();
    if (originalEnv !== undefined) {
      process.env.MCP_API_KEY = originalEnv;
    }
    await delay(100);
  });

  it('should allow requests without authentication when no API key is configured', async () => {
    const response = await fetch(serverEndpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    });

    // Without an API key the server keeps its previous behavior and does
    // not block requests (only logs a warning).
    expect(response.status).toBe(200);
  });
});
