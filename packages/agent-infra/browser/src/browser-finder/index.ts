/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Logger, defaultLogger } from '@agent-infra/logger';

import { getAnyEdgeStable } from 'edge-paths';
import { getAnyChromeStable } from './chrome-paths';
import { getAnyFirefoxStable } from './firefox-paths';

import { BrowserType } from '../types';

export class BrowserFinder {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;
  }

  public findBrowser(name?: BrowserType): { path: string; type: BrowserType } {
    const platform = process.platform;
    let browserPath: string;
    let browserType: BrowserType;

    this.logger.info('Find browser on platform:', platform);

    if (!['darwin', 'win32', 'linux'].includes(platform)) {
      const error = new Error(`Unsupported platform: ${platform}`);
      this.logger.error(error.message);
      throw error;
    }

    switch (name) {
      case 'chrome':
        browserPath = this.findChrome();
        browserType = 'chrome';
        break;
      case 'edge':
        // https://learn.microsoft.com/en-us/microsoft-edge/puppeteer/
        browserPath = this.findEdge();
        browserType = 'edge';
        break;
      case 'firefox':
        // https://pptr.dev/webdriver-bidi/#automate-with-chrome-and-firefox
        browserPath = this.findFirefox();
        browserType = 'firefox';
        break;
      default:
        const value = this.findAnyBrowser();
        browserPath = value.path;
        browserType = value.type;
        break;
    }

    this.logger.info('browserPath:', browserPath);

    return {
      path: browserPath,
      type: browserType,
    };
  }

  private findChrome(): string {
    try {
      return getAnyChromeStable();
    } catch (e) {
      this.logger.error('Find Chrome Error:', e);
      throw e;
    }
  }

  private findEdge(): string {
    try {
      return getAnyEdgeStable();
    } catch (e) {
      this.logger.error('Find Edge Error:', e);
      throw e;
    }
  }

  private findFirefox(): string {
    try {
      return getAnyFirefoxStable();
    } catch (e) {
      this.logger.error('Find Firefox Error:', e);
      throw e;
    }
  }

  private findAnyBrowser(): { path: string; type: BrowserType } {
    try {
      return {
        path: getAnyChromeStable(),
        type: 'chrome',
      };
    } catch (e) {
      this.logger.warn('Find Chrome Error:', e);
    }

    try {
      return {
        path: getAnyEdgeStable(),
        type: 'edge',
      };
    } catch (e) {
      this.logger.warn('Find Edge Error:', e);
    }

    try {
      return {
        path: getAnyFirefoxStable(),
        type: 'firefox',
      };
    } catch (e) {
      this.logger.warn('Find Firefox Error:', e);
    }

    const error = new Error('Unable to find any browser.');
    error.name = 'BrowserPathsError';
    throw error;
  }
}
