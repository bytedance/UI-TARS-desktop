/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as puppeteer from 'puppeteer-core';
import { BrowserFinder } from './browser-finder';
import { BaseBrowser } from './base-browser';

import type { BrowserType, LaunchOptions } from './types';

/**
 * LocalBrowser class for controlling locally installed browsers
 * Extends the BaseBrowser with functionality specific to managing local browser instances
 * @extends BaseBrowser
 */
export class LocalBrowser extends BaseBrowser {
  /**
   * Launches a local browser instance with specified options
   * Automatically detects installed browsers if no executable path is provided
   * @param {LaunchOptions} options - Configuration options for launching the browser
   * @returns {Promise<void>} Promise that resolves when the browser is successfully launched
   * @throws {Error} If the browser cannot be launched
   */
  async launch(options: LaunchOptions = {}): Promise<void> {
    this.logger.info('Launching browser with options:', options);

    const { path, type } = this.getBrowserInfo(options);
    const viewportWidth = options?.defaultViewport?.width ?? 1280;
    const viewportHeight = options?.defaultViewport?.height ?? 800;

    const puppeteerLaunchOptions: puppeteer.LaunchOptions = {
      browser: type,
      executablePath: path,
      dumpio: options?.dumpio ?? false,
      headless: options?.headless ?? false,
      defaultViewport: {
        width: viewportWidth,
        height: viewportHeight,
        // Setting this value to 0 will reset this value to the system default.
        // This parameter combined with `captureBeyondViewport: false`, will resolve the screenshot blinking issue.
        deviceScaleFactor: 0,
      },
      ...(options.userDataDir && {
        userDataDir: options.userDataDir,
      }),
      args: [
        '--no-sandbox',
        '--mute-audio',
        '--disable-gpu',
        '--disable-http2',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-background-timer-throttling',
        '--disable-popup-blocking',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-window-activation',
        '--disable-focus-on-load',
        '--no-default-browser-check', // disable default browser check
        '--disable-web-security', // disable CORS
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        `--window-size=${viewportWidth},${viewportHeight + 90}`,
        options?.proxy ? `--proxy-server=${options.proxy}` : '',
        options?.proxyBypassList
          ? `--proxy-bypass-list=${options.proxyBypassList}`
          : '',
        options?.profilePath
          ? `--profile-directory=${options.profilePath}`
          : '',
        ...(options.args ?? []),
      ].filter((item) => {
        if (type === 'firefox') {
          // firefox not support rules
          if (
            item === '--disable-features=IsolateOrigins,site-per-process' ||
            item === `--window-size=${viewportWidth},${viewportHeight + 90}`
          ) {
            return false;
          }

          return !!item;
        }

        // chrome/edge
        return !!item;
      }),
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: options.timeout ?? 0,
      downloadBehavior: {
        policy: 'deny',
      },
    };

    this.logger.info('Launch options:', puppeteerLaunchOptions);

    try {
      this.browser = await puppeteer.launch(puppeteerLaunchOptions);
      await this.setupPageListener();
      this.logger.success('Browser launched successfully');
    } catch (error) {
      this.logger.error('Failed to launch browser:', error);
      throw error;
    }
  }

  private getBrowserInfo(options: LaunchOptions = {}) {
    // pptr only support 'chrome' and 'firefox'
    const map: Record<BrowserType, Exclude<BrowserType, 'edge'>> = {
      chrome: 'chrome',
      edge: 'chrome',
      firefox: 'firefox',
    };

    let browserPath = options.executablePath;
    let browserType = options.browserType && map[options.browserType];

    if (!browserPath) {
      const browserInfo = new BrowserFinder(this.logger).findBrowser();
      browserPath = browserInfo.path;
      browserType = map[browserInfo.type];
    } else {
      if (!browserType) {
        const lowercasePath = browserPath.toLowerCase();

        if (lowercasePath.includes('chrome')) {
          browserType = 'chrome';
        } else if (lowercasePath.includes('edge')) {
          browserType = 'chrome'; // pptr only support 'chrome' and 'firefox'
        } else if (lowercasePath.includes('firefox')) {
          browserType = 'firefox';
        } else {
          browserType = 'chrome';
        }
      }
    }

    this.logger.info('Using executable path:', browserPath);

    return {
      path: browserPath,
      type: browserType,
    };
  }
}
