/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './index';

// Mock the console to avoid noise in test output
vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock fs module
vi.mock('node:fs', () => {
  const mockExistsSync = vi.fn();
  const mockReadFile = vi.fn();

  return {
    default: {
      existsSync: mockExistsSync,
      promises: {
        readFile: mockReadFile,
      },
    },
    existsSync: mockExistsSync,
    promises: {
      readFile: mockReadFile,
    },
  };
});

// Mock path module
vi.mock('node:path', () => {
  const mockJoin = vi.fn((root, file) => `${root}/${file}`);
  const mockIsAbsolute = vi.fn((p) => p.startsWith('/'));

  return {
    default: {
      join: mockJoin,
      isAbsolute: mockIsAbsolute,
    },
    join: mockJoin,
    isAbsolute: mockIsAbsolute,
  };
});

// Mock jiti
vi.mock('jiti', () => ({
  createJiti: vi.fn(() => ({
    import: vi.fn(),
  })),
}));

// Mock js-yaml
vi.mock('js-yaml', () => ({
  default: {
    load: vi.fn(),
  },
}));

// Mock dynamic imports
vi.mock('node:url', () => ({
  pathToFileURL: vi.fn((path) => ({ href: `file://${path}` })),
}));

describe('loadConfig', async () => {
  const mockCwd = '/mock/cwd';
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { createJiti } = await import('jiti');
  const yaml = await import('js-yaml');

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns empty object when no config file is found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await loadConfig({
      cwd: mockCwd,
      configFiles: ['config.ts'],
    });

    expect(result).toEqual({
      content: {},
      filePath: null,
    });
  });

  it('loads JSON config file correctly', async () => {
    const mockConfigPath = `${mockCwd}/config.json`;
    const mockConfig = { key: 'value' };

    vi.mocked(fs.existsSync).mockImplementation((path) => path === mockConfigPath);
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockConfig));

    const result = await loadConfig({
      cwd: mockCwd,
      configFiles: ['config.json'],
    });

    expect(result.filePath).toBe(mockConfigPath);
    expect(result.content).toEqual(mockConfig);
  });

  it('loads YAML config file correctly', async () => {
    const mockConfigPath = `${mockCwd}/config.yml`;
    const mockConfig = { key: 'value' };

    vi.mocked(fs.existsSync).mockImplementation((path) => path === mockConfigPath);
    vi.mocked(fs.promises.readFile).mockResolvedValue('key: value');
    vi.mocked(yaml.default.load).mockReturnValue(mockConfig);

    const result = await loadConfig({
      cwd: mockCwd,
      configFiles: ['config.yml'],
    });

    expect(result.filePath).toBe(mockConfigPath);
    expect(result.content).toEqual(mockConfig);
  });

  it('should support custom config path', async () => {
    const customPath = 'custom/path/config.js';
    const absolutePath = `${mockCwd}/${customPath}`;

    vi.mocked(path.isAbsolute).mockReturnValue(false);
    vi.mocked(path.join).mockReturnValue(absolutePath);
    vi.mocked(fs.existsSync).mockImplementation((p) => p === absolutePath);

    // Mock jiti to return a config object
    const mockConfig = { key: 'custom' };
    const mockJitiImport = vi.fn().mockResolvedValue(mockConfig);
    vi.mocked(createJiti).mockReturnValue({
      import: mockJitiImport,
    } as any);

    const result = await loadConfig({
      cwd: mockCwd,
      path: customPath,
    });

    expect(result.filePath).toBe(absolutePath);
    expect(result.content).toEqual(mockConfig);
  });

  it('handles function exports with environment info', async () => {
    const mockConfigPath = `${mockCwd}/config.ts`;
    const mockConfigFn = vi.fn(({ env }) => ({ mode: env }));

    vi.mocked(fs.existsSync).mockImplementation((path) => path === mockConfigPath);

    // Mock jiti to return a function
    vi.mocked(createJiti).mockReturnValue({
      import: vi.fn().mockResolvedValue(mockConfigFn),
    } as any);

    // Set environment
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const result = await loadConfig({
      cwd: mockCwd,
      configFiles: ['config.ts'],
    });

    expect(mockConfigFn).toHaveBeenCalledWith({
      env: 'test',
      envMode: 'test',
      meta: {},
    });
    expect(result.content.mode).toBe('test');

    // Restore environment
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('supports generic type parameters', async () => {
    interface TestConfig {
      port: number;
      debug: boolean;
    }

    const mockConfigPath = `${mockCwd}/config.json`;
    const mockConfig: TestConfig = { port: 3000, debug: true };

    vi.mocked(fs.existsSync).mockImplementation((path) => path === mockConfigPath);
    vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockConfig));

    const result = await loadConfig<TestConfig>({
      cwd: mockCwd,
      configFiles: ['config.json'],
    });

    // TypeScript should recognize result.content as TestConfig
    expect(result.content.port).toBe(3000);
    expect(result.content.debug).toBe(true);
  });
});
