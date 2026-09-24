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
      // Simulate servers that do not support SSE streams in stateless mode
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

describe('MCPServerEndpoint stateless Streamable HTTP integration', () => {
  let MCPHubCtor: MCPHubConstructor;
  let MCPServerEndpointCtor: MCPServerEndpointConstructor;
  let hub: InstanceType<MCPHubConstructor>;
  let endpoint: InstanceType<MCPServerEndpointConstructor>;
  let fetchImpl: typeof fetch;
  const baseUrl = 'http://mcp.local/mcp';

  beforeAll(async () => {
    ({ MCPHub: MCPHubCtor } = await import('../src/MCPHub.js'));
    ({ MCPServerEndpoint: MCPServerEndpointCtor } = await import(
      '../src/mcp/server.js'
    ));

    hub = new MCPHubCtor({}, { port: 0 });

    const fakeConnection: any = {
      name: 'stateless-fixture',
      status: 'connected',
      disabled: false,
      tools: [
        {
          name: 'stateless_echo',
          description: 'Echoes provided text for integration testing',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text that will be echoed back',
              },
            },
            required: ['text'],
          },
        },
      ],
      resources: [],
      resourceTemplates: [],
      prompts: [],
      config: {
        description: 'In-memory connection for stateless tests',
        category: 'tests',
        tags: ['stateless'],
      },
      serverInfo: {
        name: 'stateless-fixture',
        version: '0.0.1',
      },
    };

    hub.connections.set(fakeConnection.name, fakeConnection);
    hub.hubServerUrl = baseUrl.replace('/mcp', '');

    endpoint = new MCPServerEndpointCtor(hub, { stateless: true });
    fetchImpl = createInMemoryFetch(endpoint);
  }, 20000);

  afterAll(async () => {
    if (endpoint) {
      await endpoint.close();
    }
  });

  it('allows clients to call tools/list without session negotiation', async () => {
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl), {
      fetch: fetchImpl,
    });
    const client = new Client({
      name: 'stateless-client',
      version: '0.0.1',
    });

    try {
      await client.connect(transport);
      expect(transport.sessionId).toBeUndefined();

      const toolsResult = await client.request(
        {
          method: 'tools/list',
          params: {},
        },
        ListToolsResultSchema,
      );

      expect(toolsResult.tools).toHaveLength(1);
      expect(toolsResult.tools[0].name).toBe('stateless_echo');
    } finally {
      await client.close();
    }
  }, 20000);
});
