import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCPConnection } from '../src/MCPConnection.js';

// Mock all external dependencies
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
  getDefaultEnvironment: vi.fn(() => ({ NODE_ENV: 'test' })),
}));

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

vi.mock('../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../src/utils/dev-watcher.js', () => ({
  DevWatcher: vi.fn(() => ({
    on: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

// Mock child_process for EnvResolver
let mockExecPromise;
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn().mockImplementation(() => {
    return (...args) => mockExecPromise(...args);
  }),
}));

describe('MCPConnection Integration Tests', () => {
  let connection;
  let mockClient;
  let mockTransport;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup exec mock for EnvResolver
    mockExecPromise = vi.fn();

    // Setup fresh process.env for each test
    process.env = {
      NODE_ENV: 'test',
      API_KEY: 'secret_key',
      CUSTOM_VAR: 'custom_value',
      PRIVATE_DOMAIN: 'private.example.com',
      MCP_BINARY_PATH: '/usr/local/bin',
    };

    // Setup mock client
    const { Client } = await import(
      '@modelcontextprotocol/sdk/client/index.js'
    );
    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(),
      setNotificationHandler: vi.fn(),
      onerror: null,
      onclose: null,
    };
    Client.mockReturnValue(mockClient);

    // Setup mock transport
    const { StdioClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/stdio.js'
    );
    mockTransport = {
      close: vi.fn().mockResolvedValue(undefined),
      stderr: {
        on: vi.fn(),
      },
    };
    StdioClientTransport.mockReturnValue(mockTransport);
  });

  describe('Basic Connection Lifecycle', () => {
    it('should initialize in disconnected state', () => {
      const config = {
        command: 'test-server',
        args: ['--port', '3000'],
        type: 'stdio',
      };

      connection = new MCPConnection('test-server', config);

      expect(connection.status).toBe('disconnected');
      expect(connection.name).toBe('test-server');
      expect(connection.transportType).toBe('stdio');
      expect(connection.tools).toEqual([]);
      expect(connection.resources).toEqual([]);
      expect(connection.prompts).toEqual([]);
    });

    it('should handle disabled servers', () => {
      const config = {
        command: 'test-server',
        args: [],
        type: 'stdio',
        disabled: true,
      };

      connection = new MCPConnection('test-server', config);

      expect(connection.status).toBe('disabled');
      expect(connection.disabled).toBe(true);
    });
  });

  describe('Real Environment Resolution Integration', () => {
    it('should resolve stdio server config with actual envResolver', async () => {
      const config = {
        command: '${MCP_BINARY_PATH}/server',
        args: ['--token', '${API_KEY}', '--custom', '${CUSTOM_VAR}'],
        env: {
          RESOLVED_VAR: '${API_KEY}',
          COMBINED_VAR: 'prefix-${CUSTOM_VAR}-suffix',
        },
        type: 'stdio',
      };

      connection = new MCPConnection('test-server', config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      });

      await connection.connect();

      // Verify transport was created with actually resolved config
      const { StdioClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/stdio.js'
      );
      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: '/usr/local/bin/server', // ${MCP_BINARY_PATH} resolved
        args: ['--token', 'secret_key', '--custom', 'custom_value'], // ${API_KEY} and ${CUSTOM_VAR} resolved
        env: expect.objectContaining({
          RESOLVED_VAR: 'secret_key', // ${API_KEY} resolved
          COMBINED_VAR: 'prefix-custom_value-suffix', // ${CUSTOM_VAR} resolved in string
        }),
        stderr: 'pipe',
      });

      expect(connection.status).toBe('connected');
    });

    it('should resolve remote server with command execution in headers', async () => {
      const config = {
        url: 'https://${PRIVATE_DOMAIN}/mcp',
        headers: {
          Authorization: 'Bearer ${cmd: echo auth_token_123}',
          'X-Custom': '${CUSTOM_VAR}',
        },
        type: 'sse',
      };

      // Mock command execution
      mockExecPromise.mockResolvedValueOnce({ stdout: 'auth_token_123\n' });

      connection = new MCPConnection('test-server', config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      });

      // Mock HTTP transport (should be tried first)
      const { StreamableHTTPClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/streamableHttp.js'
      );
      const mockHTTPTransport = { close: vi.fn() };
      StreamableHTTPClientTransport.mockReturnValue(mockHTTPTransport);

      await connection.connect();

      // Verify command was executed
      expect(mockExecPromise).toHaveBeenCalledWith(
        'echo auth_token_123',
        expect.objectContaining({ timeout: 30000, encoding: 'utf8' }),
      );

      // Verify transport was created with actually resolved config
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL('https://private.example.com/mcp'), // ${PRIVATE_DOMAIN} resolved
        expect.objectContaining({
          requestInit: {
            headers: {
              Authorization: 'Bearer auth_token_123', // ${cmd: echo auth_token_123} executed
              'X-Custom': 'custom_value', // ${CUSTOM_VAR} resolved
            },
          },
        }),
      );

      expect(connection.status).toBe('connected');
    });

    it('should resolve env field providing context for headers field', async () => {
      const config = {
        url: 'https://api.example.com',
        env: {
          // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
          SECRET_TOKEN: '${cmd: echo secret_from_env}',
        },
        headers: {
          Authorization: 'Bearer ${SECRET_TOKEN}', // Should use resolved env value
        },
        type: 'sse',
      };

      // Mock command execution
      mockExecPromise.mockResolvedValueOnce({ stdout: 'secret_from_env\n' });

      connection = new MCPConnection('test-server', config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      });

      // Mock HTTP transport
      const { StreamableHTTPClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/streamableHttp.js'
      );
      const mockHTTPTransport = { close: vi.fn() };
      StreamableHTTPClientTransport.mockReturnValue(mockHTTPTransport);

      await connection.connect();

      // Verify command was executed for env
      expect(mockExecPromise).toHaveBeenCalledWith(
        'echo secret_from_env',
        expect.objectContaining({ timeout: 30000, encoding: 'utf8' }),
      );

      // Verify headers used resolved env value
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL('https://api.example.com'),
        expect.objectContaining({
          requestInit: {
            headers: {
              Authorization: 'Bearer secret_from_env', // ${SECRET_TOKEN} resolved from env
            },
          },
        }),
      );

      expect(connection.status).toBe('connected');
    });

    it('should work with remote servers having no env field (the original bug)', async () => {
      const config = {
        url: 'https://api.example.com',
        headers: {
          Authorization: 'Bearer ${cmd: echo remote_token_directly}',
        },
        type: 'sse',
      };

      // Mock command execution
      mockExecPromise.mockResolvedValueOnce({
        stdout: 'remote_token_directly\n',
      });

      connection = new MCPConnection('test-server', config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      });

      // Mock HTTP transport
      const { StreamableHTTPClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/streamableHttp.js'
      );
      const mockHTTPTransport = { close: vi.fn() };
      StreamableHTTPClientTransport.mockReturnValue(mockHTTPTransport);

      await connection.connect();

      // Verify command was executed directly in headers field
      expect(mockExecPromise).toHaveBeenCalledWith(
        'echo remote_token_directly',
        expect.objectContaining({ timeout: 30000, encoding: 'utf8' }),
      );

      // Verify headers resolved correctly without env field
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL('https://api.example.com'),
        expect.objectContaining({
          requestInit: {
            headers: {
              Authorization: 'Bearer remote_token_directly',
            },
          },
        }),
      );

      expect(connection.status).toBe('connected');
    });

    it('should handle legacy $VAR syntax with deprecation warning', async () => {
      const config = {
        command: 'test-server',
        args: ['--token', '$API_KEY'], // Legacy syntax
        env: {
          SOME_VAR: 'value',
        },
        type: 'stdio',
      };

      connection = new MCPConnection('test-server', config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      });

      await connection.connect();

      // Verify legacy syntax still works
      const { StdioClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/stdio.js'
      );
      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'test-server',
        args: ['--token', 'secret_key'], // $API_KEY resolved from process.env
        env: expect.objectContaining({
          SOME_VAR: 'value',
        }),
        stderr: 'pipe',
      });

      expect(connection.status).toBe('connected');
    });
  });

  describe('Error Handling', () => {
    it('should fail connection on command execution failures in strict mode', async () => {
      const config = {
        url: 'https://api.example.com',
        headers: {
          Authorization: 'Bearer ${cmd: failing-command}',
        },
        type: 'sse',
      };

      // Mock command to fail
      mockExecPromise.mockRejectedValueOnce(new Error('Command not found'));

      connection = new MCPConnection('test-server', config);

      // Connection should fail due to command execution failure
      await expect(connection.connect()).rejects.toThrow(
        /Failed to connect to "test-server" MCP server: cmd execution failed:/,
      );

      // Command should have been attempted
      expect(mockExecPromise).toHaveBeenCalledWith(
        'failing-command',
        expect.objectContaining({ timeout: 30000, encoding: 'utf8' }),
      );

      expect(connection.status).toBe('disconnected');
    });

    it('should handle transport creation errors', async () => {
      const config = {
        command: '${MCP_BINARY_PATH}/server',
        args: [],
        env: {},
        type: 'stdio',
      };

      connection = new MCPConnection('test-server', config);

      // Mock transport creation failure
      const { StdioClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/stdio.js'
      );
      StdioClientTransport.mockImplementation(() => {
        throw new Error('Transport creation failed');
      });

      await expect(connection.connect()).rejects.toThrow(
        'Failed to connect to "test-server" MCP server: Transport creation failed',
      );
    });
  });
});
