/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi } from 'vitest';

// Mock file system operations for testing
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    statSync: vi.fn().mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
      size: 1024,
      mtime: new Date(),
    }),
    readdirSync: vi.fn().mockReturnValue([]),
    mkdtempSync: vi.fn().mockImplementation((prefix) => {
      // Return a mock temp directory path
      return `/tmp/${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }),
    rmSync: vi.fn().mockImplementation(() => {
      // Mock implementation for cleanup
    }),
  };
});

// Mock path operations
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    resolve: vi.fn((p) => p),
    relative: vi.fn((from, to) => to),
  };
});

// Mock all problematic modules that cause ES module issues
vi.mock('@tarko/shared-media-utils', () => ({
  default: {},
}));

vi.mock('@tarko/shared-utils', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('@tarko/agent-snapshot', () => ({
  AgentSnapshot: vi.fn().mockImplementation((agent) => agent),
}));

vi.mock('@tarko/agio', () => ({
  AgioEvent: {
    AgioProvider: vi.fn(),
  },
}));

// Mock agent resolver to avoid complex dependency chains
vi.mock('../utils/agent-resolver', () => ({
  resolveAgentImplementation: vi.fn().mockResolvedValue({
    agentConstructor: class MockAgent {
      constructor() {}
      async initialize() {}
      async run() {
        return { success: true };
      }
      status() {
        return 'ready';
      }
      abort() {
        return false;
      }
      getEventStream() {
        return { subscribe: vi.fn(() => vi.fn()) };
      }
      async dispose() {}
    },
    agentName: 'mock-agent',
  }),
}));

// Mock workspace static server
vi.mock('../utils/workspace-static-server', () => ({
  setupWorkspaceStaticServer: vi.fn(),
}));

// Mock storage providers
vi.mock('../storage', () => ({
  createStorageProvider: vi.fn().mockReturnValue(null),
}));

// Mock Socket.IO setup
vi.mock('../core/SocketHandlers', () => ({
  setupSocketIO: vi.fn().mockReturnValue({
    emit: vi.fn(),
    on: vi.fn(),
  }),
}));

// Mock HTTP and Express properly
vi.mock('http', async () => {
  const actual = await vi.importActual('http');
  return {
    ...actual,
    createServer: vi.fn().mockReturnValue({
      listen: vi.fn((port, callback) => {
        if (callback) callback();
        return {
          address: () => ({ port: port || 3000 }),
          close: vi.fn((callback) => {
            if (callback) callback();
          }),
        };
      }),
      address: () => ({ port: 3000 }),
      close: vi.fn((callback) => {
        if (callback) callback();
      }),
    }),
    request: vi.fn(),
  };
});

// Mock Express with proper app.group method
vi.mock('express', async () => {
  const actual = await vi.importActual('express');

  const createMockApp = () => ({
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    listen: vi.fn(),
    locals: {},
    group: vi.fn((prefix, ...handlers) => {
      const callback = handlers[handlers.length - 1];
      if (typeof callback === 'function') {
        const mockRouter = {
          get: vi.fn(),
          post: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
        };
        callback(mockRouter);
      }
    }),
  });

  return {
    ...actual,
    default: vi.fn(() => createMockApp()),
    json: vi.fn(),
    Router: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
  };
});

// Mock CORS
vi.mock('cors', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

// Mock Socket.IO
vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    emit: vi.fn(),
  })),
}));

// Increase test timeout for integration tests
vi.setConfig({ testTimeout: 15000 });
