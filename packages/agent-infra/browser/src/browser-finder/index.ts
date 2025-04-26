/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Logger, defaultLogger } from '@agent-infra/logger';

import { getAnyEdgeStable } from 'edge-paths';
import { getAnyChromeStable } from './chrome-paths';

export class BrowserFinder {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;
  }

  public findBrowser(name?: 'chrome' | 'edge'): string {
    const platform = process.platform;
    let browserPath: string;

    this.logger.info('Find browser on platform:', platform);

    if (!['darwin', 'win32', 'linux'].includes(platform)) {
      const error = new Error(`Unsupported platform: ${platform}`);
      this.logger.error(error.message);
      throw error;
    }

    if (name === 'chrome') {
      browserPath = this.findChrome();
    } else if (name === 'edge') {
      browserPath = this.findEdge();
    } else {
      browserPath = this.findChrome();

      if (!browserPath) {
        browserPath = this.findEdge();
      }
    }
    this.logger.info('browserPath:', browserPath);

    return browserPath;
  }

  private findChrome(): string {
    try {
      return getAnyChromeStable();
    } catch (e) {
      this.logger.error('Find Chrome Error', e);
      throw e;
    }
  }

  private findEdge(): string {
    try {
      return getAnyEdgeStable();
    } catch (e) {
      this.logger.error('Find Edge Error', e);
      throw e;
    }
  }
}
