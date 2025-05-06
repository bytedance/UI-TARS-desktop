/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as puppeteer from 'puppeteer-core';
import { BaseBrowser, BaseBrowserOptions } from './base-browser';
import { LaunchOptions } from './types';

/**
 * Configuration options for RemoteBrowser
 * @extends BaseBrowserOptions
 * @interface RemoteBrowserOptions
 * @property {string} [wsEndpoint] - WebSocket endpoint URL for direct connection
 * @property {string} [host] - Remote host address (default: 'localhost')
 * @property {number} [port] - Remote debugging port (default: 9222)
 */
export interface RemoteBrowserOptions extends BaseBrowserOptions {
  wsEndpoint?: string;
  host?: string;
  port?: number;
}

/**
 * RemoteBrowser class for connecting to remote browser instances
 *
 * Currently, this RemoteBrowser is not production ready,
 * mainly because it still relies on `puppeteer-core`,
 * which can only run on Node.js.
 *
 * At the same time, Chrome instances built with
 * `--remote-debugging-address` on Linux have security risks
 *
 * @see https://issues.chromium.org/issues/41487252
 * @see https://issues.chromium.org/issues/40261787
 * @see https://github.com/pyppeteer/pyppeteer/pull/379
 * @see https://stackoverflow.com/questions/72760355/chrome-remote-debugging-not-working-computer-to-computer
 *
 * @extends BaseBrowser
 */
export class RemoteBrowser extends BaseBrowser {
  /**
   * Creates a new RemoteBrowser instance
   * @param {RemoteBrowserOptions} [options] - Configuration options for remote browser connection
   */
  constructor(private options?: RemoteBrowserOptions) {
    super(options);
  }

  /**
   * Connects to a remote browser instance using WebSocket
   * If no WebSocket endpoint is provided, attempts to discover it using the DevTools Protocol
   * @param {LaunchOptions} [options] - Launch configuration options
   * @returns {Promise<void>} Promise that resolves when connected to the remote browser
   * @throws {Error} If connection to the remote browser fails
   */
  async launch(options?: LaunchOptions): Promise<void> {
    this.logger.info('Browser Launch options:', options);

    let browserWSEndpoint = this.options?.wsEndpoint;

    if (!browserWSEndpoint) {
      const host = this.options?.host || 'localhost';
      const port = this.options?.port || 9222;
      const response = await fetch(`http://${host}:${port}/json/version`);
      const { webSocketDebuggerUrl } = await response.json();
      browserWSEndpoint = webSocketDebuggerUrl;
    }

    if (!browserWSEndpoint) {
      throw new Error('No WebSocket endpoint available');
    }

    await this.connect({ browserWSEndpoint });
  }

  /**
   * Connect to an existing browser instance via WebSocket endpoint
   * @param {Object} options - Connection options
   * @param {string} options.browserWSEndpoint - WebSocket endpoint URL
   * @returns {Promise<void>} Promise resolving when connection is established
   */
  async connect(options: { browserWSEndpoint: string }): Promise<void> {
    this.logger.info('Using WebSocket endpoint:', options.browserWSEndpoint);

    const puppeteerConnectOptions: puppeteer.ConnectOptions = {
      browserWSEndpoint: options.browserWSEndpoint,
      defaultViewport: null,
    };

    try {
      this.browser = await puppeteer.connect(puppeteerConnectOptions);
      await this.setupPageListener();
      this.logger.success('Connected to remote browser successfully');
    } catch (error) {
      this.logger.error('Failed to connect to remote browser:', error);
      throw error;
    }
  }
}
