import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPServerEndpoint } from '../src/mcp/server.js';
import { MCPHub } from '../src/MCPHub.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const mocks = vi.hoisted(() => ({
  streamableInstances: [] as any[],
  serverInstances: [] as any[],
  isInitializeRequest: vi.fn().mockReturnValue(true),
}));

vi.mock('../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  const { streamableInstances } = mocks;
  const StreamableHTTPServerTransport = vi
    .fn()
    .mockImplementation((options) => {
      const instance = {
        options,
        handleRequest: vi.fn().mockResolvedValue(undefined),
        handlePostMessage: vi.fn(),
        sessionId: undefined,
        _onclose: undefined as ((...args: any[]) => void) | undefined,
        set onclose(cb: (...args: any[]) => void) {
          this._onclose = cb;
        },
        get onclose() {
          return this._onclose;
        },
      };
      streamableInstances.push(instance);
      return instance;
    });

  (StreamableHTTPServerTransport as any).__instances = streamableInstances;
  (StreamableHTTPServerTransport as any).__reset = () => {
    streamableInstances.length = 0;
  };

  return { StreamableHTTPServerTransport };
});

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  const { serverInstances } = mocks;
  class MockServer {
    public _requestHandlers: Map<string, any>;
    public connect: any;
    public close: any;
    public getClientVersion: any;
    public oninitialized: any;
    public onerror: any;
    public connectedTransport?: any;

    constructor() {
      this._requestHandlers = new Map();
      this.connect = vi.fn().mockImplementation(async (transport: any) => {
        this.connectedTransport = transport;
      });
      this.close = vi.fn().mockResolvedValue(undefined);
      this.getClientVersion = vi.fn();
      this.oninitialized = undefined;
      this.onerror = undefined;
      serverInstances.push(this);
    }

    setRequestHandler(schema: any, handler: any) {
      this._requestHandlers.set(schema.method ?? schema, handler);
    }
  }

  (MockServer as any).__instances = serverInstances;
  (MockServer as any).__reset = () => {
    serverInstances.length = 0;
  };

  return { Server: MockServer };
});

vi.mock('@modelcontextprotocol/sdk/types.js', () => {
  const { isInitializeRequest } = mocks;
  const schema = (method: string) => ({ method });

  class McpError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message);
      this.code = code;
    }
  }

  return {
    ListToolsRequestSchema: schema('tools/list'),
    CallToolRequestSchema: schema('tools/call'),
    GetPromptResultSchema: schema('prompts/get/result'),
    CallToolResultSchema: schema('tools/call/result'),
    ReadResourceResultSchema: schema('resources/read/result'),
    ListResourcesRequestSchema: schema('resources/list'),
    ReadResourceRequestSchema: schema('resources/read'),
    ListResourceTemplatesRequestSchema: schema('resources/templates'),
    ListPromptsRequestSchema: schema('prompts/list'),
    GetPromptRequestSchema: schema('prompts/get'),
    McpError,
    ErrorCode: {
      InvalidParams: 'InvalidParams',
    },
    isInitializeRequest,
  };
});

describe('MCPServerEndpoint stateless transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const streamable = StreamableHTTPServerTransport as any;
    if (typeof streamable.__reset === 'function') {
      streamable.__reset();
    }
    const serverMock = Server as any;
    if (typeof serverMock.__reset === 'function') {
      serverMock.__reset();
    }
    mocks.isInitializeRequest.mockClear();
  });

  it('uses stateless Streamable HTTP transport when configured', async () => {
    const hub = new MCPHub({}, {});
    hub.connections = new Map();

    const endpoint = new MCPServerEndpoint(hub, { stateless: true });

    const req: any = {
      headers: {},
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          capabilities: {},
        },
      },
      query: {},
    };

    const res: any = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await endpoint.handleStreamableHttpRequest(req, res);

    expect(StreamableHTTPServerTransport).toHaveBeenCalledTimes(1);
    expect(StreamableHTTPServerTransport).toHaveBeenCalledWith({
      enableJsonResponse: true,
      sessionIdGenerator: undefined,
    });

    const transportInstance = (StreamableHTTPServerTransport as any).mock
      .results[0].value;
    expect(transportInstance.handleRequest).toHaveBeenCalledWith(
      req,
      res,
      req.body,
    );

    const serverInstances = (Server as any).__instances as any[];
    expect(serverInstances).toHaveLength(1);
    expect(serverInstances[0].connect).toHaveBeenCalledWith(transportInstance);

    const endpointAny = endpoint as any;
    expect(endpointAny.streamableHttpTransports.size).toBe(0);
  });
});
