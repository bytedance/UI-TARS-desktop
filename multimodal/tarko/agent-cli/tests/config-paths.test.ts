/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { buildConfigPaths } from '../src/config/paths';
import * as fs from 'fs';

// Mock fs and path
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('buildConfigPaths', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return CLI config paths when no other options provided', () => {
    const cliConfigPaths = ['./config1.json', './config2.json'];

    const result = buildConfigPaths({ cliConfigPaths });

    expect(result).toEqual(cliConfigPaths);
  });

  it('should add remote config with lowest priority', () => {
    const cliConfigPaths = ['./config1.json', './config2.json'];
    const remoteConfig = 'https://remote-config.com/config.json';

    const result = buildConfigPaths({
      cliConfigPaths,
      remoteConfig,
    });

    expect(result).toEqual([remoteConfig, ...cliConfigPaths]);
  });

  it('should add workspace config with highest priority', () => {
    const cliConfigPaths = ['./config1.json'];
    const workspace = '/workspace/path';

    // Mock fs.existsSync to return true for the first config file
    vi.mocked(fs.existsSync).mockImplementation((path: string) => {
      return path === `${workspace}/tarko.config.ts`;
    });

    const result = buildConfigPaths({
      cliConfigPaths,
      workspace,
    });

    expect(result).toEqual([...cliConfigPaths, `${workspace}/tarko.config.ts`]);
  });

  it('should handle all config sources together in correct priority order', () => {
    const cliConfigPaths = ['./user-config.json'];
    const remoteConfig = 'https://remote-config.com/config.json';
    const workspace = '/workspace/path';

    // Mock fs.existsSync to return true for the workspace config
    vi.mocked(fs.existsSync).mockImplementation((path: string) => {
      return path === `${workspace}/tarko.config.json`;
    });

    const result = buildConfigPaths({
      cliConfigPaths,
      remoteConfig,
      workspace,
      isDebug: true,
    });

    // Expect: [remote config (lowest priority), cli configs, workspace config (highest priority)]
    expect(result).toEqual([remoteConfig, ...cliConfigPaths, `${workspace}/tarko.config.json`]);
  });

  it('should not add workspace config if no config file exists', () => {
    const cliConfigPaths = ['./config1.json'];
    const workspace = '/workspace/path';

    // Mock fs.existsSync to always return false
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = buildConfigPaths({
      cliConfigPaths,
      workspace,
      isDebug: true,
    });

    // Should only have CLI configs
    expect(result).toEqual(cliConfigPaths);
  });

  it('should handle empty CLI config paths', () => {
    const remoteConfig = 'https://remote-config.com/config.json';

    const result = buildConfigPaths({
      remoteConfig,
    });

    expect(result).toEqual([remoteConfig]);
  });

  it('should handle undefined CLI config paths', () => {
    const result = buildConfigPaths({});

    expect(result).toEqual([]);
  });
});
