/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import os from 'node:os';
import { McpState } from './typings.js';
import { ConsoleLogger, Logger } from '@agent-infra/logger';

export const store = new Proxy<McpState>(
  {
    globalConfig: {
      launchOptions: {
        headless: os.platform() === 'linux' && !process.env.DISPLAY,
      },
      contextOptions: {},
      enableAdBlocker: false,
      vision: false,
    },
    globalBrowser: null,
    globalPage: null,
    selectorMap: null,
    logger: new ConsoleLogger('[mcp-browser]') as Logger,
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
