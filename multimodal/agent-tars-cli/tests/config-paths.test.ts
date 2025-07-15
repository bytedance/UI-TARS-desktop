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

  it('should add bootstrap remote config with lowest priority', () => {
    const cliConfigPaths = ['./config1.json', './config2.json'];
    const bootstrapRemoteConfig = 'https://remote-config.com/config.json';

    const result = buildConfigPaths({
      cliConfigPaths,
      bootstrapRemoteConfig,
    });

    expect(result).toEqual([bootstrapRemoteConfig, ...cliConfigPaths]);
  });

  it('should add global workspace config with highest priority', () => {
    const cliConfigPaths = ['./config1.json'];
    const globalWorkspacePath = '/home/user/.agent-tars-workspace';

    // Mock fs.existsSync to return true for the first config file
    vi.mocked(fs.existsSync).mockImplementation((path: string) => {
      return path === `${globalWorkspacePath}/agent-tars.config.ts`;
    });

    const result = buildConfigPaths({
      cliConfigPaths,
      useGlobalWorkspace: true,
      globalWorkspacePath,
    });

    expect(result).toEqual([...cliConfigPaths, `${globalWorkspacePath}/agent-tars.config.ts`]);
  });

  it('should handle all config sources together in correct priority order', () => {
    const cliConfigPaths = ['./user-config.json'];
    const bootstrapRemoteConfig = 'https://remote-config.com/config.json';
    const globalWorkspacePath = '/home/user/.agent-tars-workspace';

    // Mock fs.existsSync to return true for the workspace config
    vi.mocked(fs.existsSync).mockImplementation((path: string) => {
      return path === `${globalWorkspacePath}/agent-tars.config.json`;
    });

    const result = buildConfigPaths({
      cliConfigPaths,
      bootstrapRemoteConfig,
      useGlobalWorkspace: true,
      globalWorkspacePath,
      isDebug: true,
    });

    // Expect: [remote config (lowest priority), cli configs, workspace config (highest priority)]
    expect(result).toEqual([
      bootstrapRemoteConfig,
      ...cliConfigPaths,
      `${globalWorkspacePath}/agent-tars.config.json`,
    ]);
  });

  it('should not add workspace config if no config file exists', () => {
    const cliConfigPaths = ['./config1.json'];
    const globalWorkspacePath = '/home/user/.agent-tars-workspace';

    // Mock fs.existsSync to always return false
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = buildConfigPaths({
      cliConfigPaths,
      useGlobalWorkspace: true,
      globalWorkspacePath,
      isDebug: true,
    });

    // Should only have CLI configs
    expect(result).toEqual(cliConfigPaths);
  });

  it('should handle empty CLI config paths', () => {
    const bootstrapRemoteConfig = 'https://remote-config.com/config.json';

    const result = buildConfigPaths({
      bootstrapRemoteConfig,
    });

    expect(result).toEqual([bootstrapRemoteConfig]);
  });

  it('should handle undefined CLI config paths', () => {
    const result = buildConfigPaths({});

    expect(result).toEqual([]);
  });
});
