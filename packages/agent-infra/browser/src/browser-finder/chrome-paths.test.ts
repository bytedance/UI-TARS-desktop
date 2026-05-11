/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('which', () => ({
  default: {
    sync: vi.fn(() => {
      throw new Error('not found');
    }),
  },
}));

describe('chrome-paths', () => {
  const originalPlatform = process.platform;
  const originalEnv = { ...process.env };
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.resetModules();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
    process.env = { ...originalEnv };

    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('uses PUPPETEER_EXECUTABLE_PATH before PATH lookup', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'chrome-paths-'));
    tempDirs.push(tempDir);
    const chromePath = join(tempDir, 'chrome');
    writeFileSync(chromePath, '');
    process.env.PUPPETEER_EXECUTABLE_PATH = chromePath;

    const { getAnyChromeStable } = await import('./chrome-paths');

    expect(getAnyChromeStable()).toBe(chromePath);
  });

  it('finds Chrome downloaded into Puppeteer cache on Linux', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });

    const tempDir = mkdtempSync(join(tmpdir(), 'puppeteer-cache-'));
    tempDirs.push(tempDir);
    const chromePath = join(
      tempDir,
      'chrome',
      'linux-134.0.6998.35',
      'chrome-linux64',
      'chrome',
    );
    mkdirSync(dirname(chromePath), { recursive: true });
    writeFileSync(chromePath, '');
    process.env.PUPPETEER_CACHE_DIR = tempDir;

    const { getAnyChromeStable } = await import('./chrome-paths');

    expect(getAnyChromeStable()).toBe(chromePath);
  });
});
