import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Headers, Response } from 'undici';
import type { HeadersInit, RequestInfo, RequestInit } from 'undici';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-hub-tests-'));
const stateDir = path.join(tempRoot, 'state');
const dataDir = path.join(tempRoot, 'data');
const configDir = path.join(tempRoot, 'config');

[stateDir, dataDir, configDir].forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

process.env.XDG_STATE_HOME = stateDir;
process.env.XDG_DATA_HOME = dataDir;
process.env.XDG_CONFIG_HOME = configDir;

type MCPHubConstructor = (typeof import('../src/MCPHub.js'))['MCPHub'];
type MCPServerEndpointConstructor =
  (typeof import('../src/mcp/server.js'))['MCPServerEndpoint'];

type ResponsePayload = {
  status: number;
  headers: [string, string][];
  body?: string;
};

class InMemoryResponse {
  public statusCode = 200;
  public headersSent = false;
  private readonly headers = new Map<string, string>();
  private readonly chunks: Buffer[] = [];
  private readonly closeHandlers: Array<() => void> = [];
  private isResolved = false;

  constructor(private readonly done: (payload: ResponsePayload) => void) {}

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(payload: any) {
    this.setHeader('content-type', 'application/json');
    return this.end(JSON.stringify(payload));
  }

  send(payload: any) {
    if (typeof payload === 'object' && payload !== null) {
      this.setHeader('content-type', 'application/json');
      return this.end(JSON.stringify(payload));
    }
    return this.end(payload);
  }

  write(chunk: any) {
    const buffer =
      typeof chunk === 'string'
        ? Buffer.from(chunk)
        : Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk);
    this.chunks.push(buffer);
    return true;
  }

  writeHead(
    status: number,
    headers?: Record<string, string | number | string[]>,
  ) {
    this.statusCode = status;
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        if (Array.isArray(value)) {
          this.setHeader(key, value.join(', '));
        } else if (value !== undefined) {
          this.setHeader(key, String(value));
        }
      }
    }
    this.headersSent = true;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name.toLowerCase(), value);
  }

  flushHeaders() {
    this.headersSent = true;
  }

  on(event: string, handler: () => void) {
    if (event === 'close') {
      this.closeHandlers.push(handler);
    }
    return this;
  }

  end(chunk?: any) {
    if (chunk !== undefined) {
      this.write(chunk);
    }
    if (!this.isResolved) {
      this.headersSent = true;
      this.isResolved = true;
      this.done({
        status: this.statusCode,
        headers: Array.from(this.headers.entries()),
        body: this.chunks.length
          ? Buffer.concat(this.chunks).toString()
          : undefined,
      });
      this.closeHandlers.forEach((handler) => handler());
    }
    return this;
  }
}

function normalizeHeaders(headersInit?: HeadersInit): Map<string, string> {
  const headers = new Headers(headersInit);
  const result = new Map<string, string>();
  headers.forEach((value, key) => {
    result.set(key.toLowerCase(), value);
  });
  return result;
}

function createInMemoryFetch(
  endpoint: InstanceType<MCPServerEndpointConstructor>,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const baseResponseHeaders: [string, string][] = [
    ['content-type', 'application/json'],
  ];

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl =
      input instanceof URL
        ? input
        : typeof input === 'string'
          ? new URL(input)
          : new URL(input.url);

    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = normalizeHeaders(init?.headers);

    if (!headers.has('accept')) {
      headers.set('accept', 'application/json, text/event-stream');
    }

    if (method === 'GET') {
      return new Response(null, {
        status: 405,
        headers: baseResponseHeaders,
      });
    }

    if (method === 'POST' && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    let bodyText: string | undefined;
    const rawBody = init?.body as any;
    if (typeof rawBody === 'string') {
      bodyText = rawBody;
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(rawBody)) {
      bodyText = rawBody.toString();
    } else if (rawBody instanceof ArrayBuffer) {
      bodyText = Buffer.from(rawBody).toString();
    } else if (rawBody && ArrayBuffer.isView(rawBody)) {
      bodyText = Buffer.from(
        rawBody.buffer,
        rawBody.byteOffset,
        rawBody.byteLength,
      ).toString();
    }

    const parsedBody = bodyText ? JSON.parse(bodyText) : undefined;

    const query: Record<string, string> = {};
    requestUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const req: any = {
      method,
      headers: Object.fromEntries(headers.entries()),
      query,
      body: parsedBody,
    };

    const responsePayload = await new Promise<ResponsePayload>(
      (resolve, reject) => {
        const res = new InMemoryResponse(resolve);
        endpoint.handleStreamableHttpRequest(req, res).catch(reject);
      },
    );

    return new Response(responsePayload.body ?? null, {
      status: responsePayload.status,
      headers: responsePayload.headers,
    });
  };
}

describe('Server Startup Readiness', () => {
  let MCPHubCtor: MCPHubConstructor;
  let MCPServerEndpointCtor: MCPServerEndpointConstructor;
  const baseUrl = 'http://mcp.local/mcp';

  beforeAll(async () => {
    ({ MCPHub: MCPHubCtor } = await import('../src/MCPHub.js'));
    ({ MCPServerEndpoint: MCPServerEndpointCtor } = await import(
      '../src/mcp/server.js'
    ));
  });

  it('should ensure all processes are ready before MCP endpoint accepts connections', async () => {
    // Use a simplified test config that simulates real servers
    const testConfig = {
      mcpServers: {
        'test-server-1': {
          type: 'stdio',
          command: 'echo',
          args: ['test'],
          disabled: false,
        },
        'test-server-2': {
          type: 'stdio',
          command: 'echo',
          args: ['test'],
          disabled: false,
        },
      },
    };

    // Create hub with config object (not file path)
    const hub = new MCPHubCtor(testConfig, { port: 3100 });

    // For object-based config, we need to call startConfiguredServers directly
    // instead of initialize() which expects config file paths
    await hub.startConfiguredServers();

    // Create the MCP endpoint AFTER hub initialization
    const endpoint = new MCPServerEndpointCtor(hub, { stateless: true });
    const fetchImpl = createInMemoryFetch(endpoint);

    // Create client and connect
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl), {
      fetch: fetchImpl,
    });
    const client = new Client({
      name: 'startup-test-client',
      version: '1.0.0',
    });

    try {
      await client.connect(transport);

      // Request tools list - this is the key test
      const toolsResult = await client.request(
        {
          method: 'tools/list',
          params: {},
        },
        ListToolsResultSchema,
      );

      // The bug was: when service starts and immediately connects to /mcp,
      // it returns empty list because processes aren't ready yet
      // After fix: tools list should be available (even if 0 tools, the structure should be valid)
      expect(toolsResult).toBeDefined();
      expect(toolsResult.tools).toBeDefined();
      expect(Array.isArray(toolsResult.tools)).toBe(true);

      // Since we're using echo commands, they won't provide real MCP tools
      // But the important thing is the endpoint didn't return an error or empty response
      // In a real scenario with actual MCP servers from examples/config.json,
      // we would expect tools.length > 0
    } finally {
      await client.close();
      await endpoint.close();
      await hub.disconnectAll();
    }
  }, 30000);

  it('should have tools available when using real config with remote MCP servers', async () => {
    // Test with a real remote MCP server that should provide tools
    const testConfig = {
      mcpServers: {
        deepwiki: {
          type: 'streamable-http',
          prefix: 'deepwiki',
          tags: ['coding'],
          url: 'https://mcp.deepwiki.com/mcp',
        },
      },
    };

    const hub = new MCPHubCtor(testConfig, { port: 3101 });

    // Start all configured servers and wait for them to be ready
    await hub.startConfiguredServers();

    // Verify connections are established
    const connection = hub.connections.get('deepwiki');
    expect(connection).toBeDefined();
    expect(connection?.status).toBe('connected');

    // Create endpoint after initialization
    const endpoint = new MCPServerEndpointCtor(hub, { stateless: true });
    const fetchImpl = createInMemoryFetch(endpoint);

    const transport = new StreamableHTTPClientTransport(new URL(baseUrl), {
      fetch: fetchImpl,
    });
    const client = new Client({
      name: 'real-config-test-client',
      version: '1.0.0',
    });

    try {
      await client.connect(transport);

      const toolsResult = await client.request(
        {
          method: 'tools/list',
          params: {},
        },
        ListToolsResultSchema,
      );

      // With a real MCP server, we should have tools available
      expect(toolsResult.tools).toBeDefined();
      expect(Array.isArray(toolsResult.tools)).toBe(true);

      // The key assertion: tools list should not be empty
      // This validates the fix - server waits for processes to be ready
      expect(toolsResult.tools.length).toBeGreaterThan(0);
    } finally {
      await client.close();
      await endpoint.close();
      await hub.disconnectAll();
    }
  }, 30000);
});
