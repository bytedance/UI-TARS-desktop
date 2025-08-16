/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi } from 'vitest';

// Mock file system operations for testing
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  statSync: vi.fn().mockReturnValue({
    isDirectory: () => false,
    isFile: () => true,
    size: 1024,
    mtime: new Date(),
  }),
  readdirSync: vi.fn().mockReturnValue([]),
}));

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

// Mock problematic modules that cause ES module issues
vi.mock('@tarko/shared-media-utils', () => ({
  default: {},
}));

// Mock agent resolver to avoid complex dependency chains
vi.mock('../utils/agent-resolver', () => ({
  resolveAgentImplementation: vi.fn().mockResolvedValue({
    agentConstructor: class MockAgent {
      constructor() {}
      async initialize() {}
      async run() { return { success: true }; }
      status() { return 'ready'; }
      abort() { return false; }
      getEventStream() { return { subscribe: vi.fn(() => vi.fn()) }; }
      async dispose() {}
    },
    agentName: 'mock-agent',
  }),
}));

// Mock Express app.group method
vi.mock('express', async () => {
  const actual = await vi.importActual('express');
  const mockApp = {
    ...actual,
    group: vi.fn((prefix, ...handlers) => {
      // Simple mock implementation
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
  };
  return {
    ...actual,
    default: vi.fn(() => mockApp),
  };
});

// Increase test timeout for integration tests
vi.setConfig({ testTimeout: 15000 });
