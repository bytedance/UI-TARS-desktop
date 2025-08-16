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

// Mock problematic modules
vi.mock('@tarko/shared-media-utils', () => ({
  // Mock any exports that might be needed
  default: {},
}));

// Increase test timeout for integration tests
vi.setConfig({ testTimeout: 15000 });
