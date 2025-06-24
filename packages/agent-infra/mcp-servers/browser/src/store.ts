/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import os from 'node:os';
import { McpState } from './typings.js';
import { ConsoleLogger, Logger } from '@agent-infra/logger';
import path from 'node:path';
import { sanitizeForFilePath } from './utils/utils.js';

export const store = new Proxy<McpState>(
  {
    globalConfig: {
      launchOptions: {
        headless: os.platform() === 'linux' && !process.env.DISPLAY,
      },
      contextOptions: {},
      enableAdBlocker: false,
      vision: false,
      outputDir: path.join(
        os.tmpdir(),
        'mcp-server-browser',
        sanitizeForFilePath(new Date().toISOString()),
      ),
    },
    globalBrowser: null,
    globalPage: null,
    selectorMap: null,
    downloadedFiles: [],
    logger: new ConsoleLogger('[mcp-browser]') as Logger,
    initialBrowserSetDownloadBehavior: false,
  } satisfies McpState,
  {
    get(target, prop) {
      return Reflect.get(target, prop);
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value);
    },
  },
);
