/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { buildConfigPaths } from '@tarko/cli';
import * as fs from 'fs';

// Mock fs and path
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('Agent TARS Config Paths', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add agent-tars global workspace config with highest priority', () => {
    const cliConfigPaths = ['./config1.json'];
    const globalWorkspacePath = '/home/user/.agent-tars-workspace';

    // Mock fs.existsSync to return true for the first config file
    vi.mocked(fs.existsSync).mockImplementation((path: string) => {
      return path === `${globalWorkspacePath}/agent-tars.config.ts`;
    });

    const result = buildConfigPaths({
      cliConfigPaths,
      workspacePath: globalWorkspacePath,
    });

    expect(result).toEqual([...cliConfigPaths, `${globalWorkspacePath}/agent-tars.config.ts`]);
  });

  it('should handle agent-tars specific config files', () => {
    const cliConfigPaths = ['./user-config.json'];
    const globalWorkspacePath = '/home/user/.agent-tars-workspace';

    // Mock fs.existsSync to return true for agent-tars.config.json
    vi.mocked(fs.existsSync).mockImplementation((path: string) => {
      return path === `${globalWorkspacePath}/agent-tars.config.json`;
    });

    const result = buildConfigPaths({
      cliConfigPaths,
      workspacePath: globalWorkspacePath,
      isDebug: true,
    });

    expect(result).toEqual([...cliConfigPaths, `${globalWorkspacePath}/agent-tars.config.json`]);
  });

  it('should prioritize agent-tars.config.ts over agent-tars.config.json', () => {
    const cliConfigPaths = ['./config1.json'];
    const globalWorkspacePath = '/home/user/.agent-tars-workspace';

    // Mock fs.existsSync to return true for both files, but ts should be preferred
    vi.mocked(fs.existsSync).mockImplementation((path: string) => {
      return (
        path === `${globalWorkspacePath}/agent-tars.config.ts` ||
        path === `${globalWorkspacePath}/agent-tars.config.json`
      );
    });

    const result = buildConfigPaths({
      cliConfigPaths,
      workspacePath: globalWorkspacePath,
    });

    // Should find the .ts file first and use it
    expect(result).toEqual([...cliConfigPaths, `${globalWorkspacePath}/agent-tars.config.ts`]);
  });

  it('should handle all agent-tars config sources together', () => {
    const cliConfigPaths = ['./user-config.json'];
    const remoteConfig = 'https://tars-config.com/config.json';
    const globalWorkspacePath = '/home/user/.agent-tars-workspace';

    // Mock fs.existsSync to return true for the workspace config
    vi.mocked(fs.existsSync).mockImplementation((path: string) => {
      return path === `${globalWorkspacePath}/agent-tars.config.yaml`;
    });

    const result = buildConfigPaths({
      cliConfigPaths,
      remoteConfig,
      workspacePath: globalWorkspacePath,
      isDebug: true,
    });

    // Expect: [remote config (lowest priority), cli configs, workspace config (highest priority)]
    expect(result).toEqual([
      remoteConfig,
      ...cliConfigPaths,
      `${globalWorkspacePath}/agent-tars.config.yaml`,
    ]);
  });

  it('should not add agent-tars workspace config if no config file exists', () => {
    const cliConfigPaths = ['./config1.json'];
    const globalWorkspacePath = '/home/user/.agent-tars-workspace';

    // Mock fs.existsSync to always return false
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = buildConfigPaths({
      cliConfigPaths,
      workspacePath: globalWorkspacePath,
      isDebug: true,
    });

    // Should only have CLI configs
    expect(result).toEqual(cliConfigPaths);
  });
});
