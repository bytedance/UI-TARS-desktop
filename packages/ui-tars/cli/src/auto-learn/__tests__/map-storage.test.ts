/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_CWD = process.cwd();

describe('map-storage UI map persistence', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-tars-map-storage-'));
    process.chdir(tmpDir);
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(ORIGINAL_CWD);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and loads UIMap files', async () => {
    const { saveUIMap, loadUIMap, uiMapFile } = await import('../map-storage');
    const { UI_MAP_SCHEMA_VERSION } = await import('../types');

    const pkg = 'com.example.demo';
    const uiMap = {
      meta: {
        schemaVersion: UI_MAP_SCHEMA_VERSION,
        appId: pkg,
        appName: 'demo',
        platform: 'android' as const,
        screenWidth: 1080,
        screenHeight: 2400,
        learnTime: 10,
        learnDate: '2026-04-16T00:00:00.000Z',
        device: 'device-1',
      },
      pages: {},
      regions: {},
      elements: {},
      navigation: [],
    };

    const uiPath = saveUIMap(pkg, uiMap);

    expect(path.basename(uiPath)).toBe(uiMapFile(pkg));
    expect(loadUIMap(pkg)).toEqual(uiMap);
  });

  it('rejects UIMap files with mismatched schemaVersion', async () => {
    const { MAP_DIR, loadUIMap, uiMapFile } = await import('../map-storage');
    const pkg = 'com.example.demo';
    const filePath = path.join(MAP_DIR, uiMapFile(pkg));

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        meta: { schemaVersion: 999 },
        pages: {},
        regions: {},
        elements: {},
        navigation: [],
      }),
    );

    expect(loadUIMap(pkg)).toBeNull();
  });
});
