import { describe, expect, test, vi, beforeEach } from 'vitest';

const mockCreateServer = vi.fn();
const mockStdioServerTransport = vi.fn();
const mockStartSseAndStreamableHttpMcpServer = vi.fn();
const mockParseViewportSize = vi.fn();
const mockGetConfig = vi.fn();
const mockSetConfig = vi.fn();
const mockGetBrowser = vi.fn();

vi.mock('../src/server', () => ({
  createServer: mockCreateServer,
  getBrowser: mockGetBrowser,
  getConfig: mockGetConfig,
  setConfig: mockSetConfig,
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: mockStdioServerTransport,
}));

vi.mock('mcp-http-server', () => ({
  startSseAndStreamableHttpMcpServer: mockStartSseAndStreamableHttpMcpServer,
}));

vi.mock('../src/utils/utils', () => ({
  parseViewportSize: mockParseViewportSize,
  parserFactor: vi.fn(),
}));

vi.mock('../src/request-context', () => ({
  setRequestContext: vi.fn(),
  getRequestContext: vi.fn(),
  addMiddleware: vi.fn(),
  getMiddlewares: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let actionCallback: any = null;
const mockProgram = {
  name: vi.fn().mockReturnThis(),
  description: vi.fn().mockReturnThis(),
  version: vi.fn().mockReturnThis(),
  option: vi.fn().mockReturnThis(),
  action: vi.fn().mockImplementation((callback) => {
    actionCallback = callback;
    return mockProgram;
  }),
  hook: vi.fn().mockReturnThis(),
  parse: vi.fn(),
  parseAsync: vi.fn(),
};

vi.mock('commander', () => ({
  program: mockProgram,
}));

describe('Index Entry Point Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateServer.mockReturnValue({
      connect: vi.fn(),
      server: {
        notification: vi.fn(),
        sendLoggingMessage: vi.fn(),
      },
    });
    mockStdioServerTransport.mockReturnValue({});
    mockGetBrowser.mockReturnValue({ browser: null });
    mockGetConfig.mockReturnValue({
      logger: { info: vi.fn(), error: vi.fn() },
    });
    mockStartSseAndStreamableHttpMcpServer.mockResolvedValue(undefined);
  });

  test('should register commander options and action', async () => {
    await import('../src/index');

    // 等待 process.nextTick 执行
    await new Promise((resolve) => process.nextTick(resolve));

    expect(mockProgram.name).toHaveBeenCalledWith('mcp-server-browser');
    expect(mockProgram.description).toHaveBeenCalledWith(
      'MCP server for browser',
    );
    expect(mockProgram.version).toHaveBeenCalledWith('0.0.1');
    expect(mockProgram.option).toHaveBeenCalledWith(
      '--headless',
      'run browser in headless mode, headed by default',
    );
    expect(mockProgram.action).toHaveBeenCalled();
    expect(mockProgram.parseAsync).toHaveBeenCalled();
  });

  test('should create server with default options', async () => {
    await import('../src/index');

    expect(actionCallback).toBeDefined();

    mockCreateServer.mockClear();
    mockStdioServerTransport.mockClear();

    await actionCallback({});

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        launchOptions: expect.objectContaining({
          headless: undefined,
          executablePath: undefined,
          browserType: undefined,
        }),
        contextOptions: expect.objectContaining({
          userAgent: undefined,
        }),
      }),
    );
    expect(mockStdioServerTransport).toHaveBeenCalled();
  });

  test('should create server with headless option', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({ headless: true });

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        launchOptions: expect.objectContaining({
          headless: true,
        }),
      }),
    );
  });

  test('should create server with executable path option', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({ executablePath: '/usr/bin/chromium' });

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        launchOptions: expect.objectContaining({
          executablePath: '/usr/bin/chromium',
        }),
      }),
    );
  });

  test('should create server with browser type option', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({ browser: 'firefox' });

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        launchOptions: expect.objectContaining({
          browserType: 'firefox',
        }),
      }),
    );
  });

  test('should create server with proxy options', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({
      proxyServer: 'http://proxy:3128',
      proxyBypass: '.com,chromium.org',
    });

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        launchOptions: expect.objectContaining({
          proxy: 'http://proxy:3128',
          proxyBypassList: '.com,chromium.org',
        }),
      }),
    );
  });

  test('should create server with remote CDP endpoint', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({ cdpEndpoint: 'http://127.0.0.1:9222/json/version' });

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteOptions: expect.objectContaining({
          cdpEndpoint: 'http://127.0.0.1:9222/json/version',
        }),
      }),
    );
  });

  test('should create server with WebSocket endpoint', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({
      wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/123',
    });

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteOptions: expect.objectContaining({
          wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/123',
        }),
      }),
    );
  });

  test('should create server with vision option', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({ vision: true });

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        vision: true,
      }),
    );
  });

  test('should start HTTP server when port is provided', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({ port: '3000' });

    expect(mockStartSseAndStreamableHttpMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        port: '3000',
        createMcpServer: expect.any(Function),
      }),
    );
  });

  test('should handle user agent option', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({ userAgent: 'Custom User Agent' });

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        contextOptions: expect.objectContaining({
          userAgent: 'Custom User Agent',
        }),
      }),
    );
  });

  test('should handle viewport size option', async () => {
    mockParseViewportSize.mockReturnValue({ width: 1920, height: 1080 });

    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({ viewportSize: '1920,1080' });

    expect(mockParseViewportSize).toHaveBeenCalledWith('1920,1080');
    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        contextOptions: expect.objectContaining({
          viewportSize: { width: 1920, height: 1080 },
        }),
      }),
    );
  });

  test('should handle user data directory option', async () => {
    if (!actionCallback) {
      await import('../src/index');
    }

    await actionCallback({ userDataDir: '/tmp/chrome-data' });

    expect(mockCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        launchOptions: expect.objectContaining({
          userDataDir: '/tmp/chrome-data',
        }),
      }),
    );
  });
});
