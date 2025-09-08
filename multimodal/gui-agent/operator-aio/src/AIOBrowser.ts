/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Page,
  KeyInput,
  BrowserType,
  RemoteBrowser,
  LaunchOptions,
  EvaluateOnNewPageOptions,
} from '@agent-infra/browser';
import { Logger, defaultLogger } from '@agent-infra/logger';
import { AioClient, CDPVersionResp } from '@agent-infra/sandbox';

/**
 * Configuration options for the AIOBrowser class
 * @interface AIOBrowserOptions
 * @property {string} wsEndpoint - WebSocket endpoint URL for remote browser connection
 * @property {Logger} [logger] - Custom logger instance to use for browser logging
 */
export interface AIOBrowserOptions {
  baseURl: string;
  logger?: Logger;
}

/**
 * AIOBrowser class that provides a simplified interface for browser automation
 * Directly manages a RemoteBrowser instance
 */
export class AIOBrowser {
  /**
   * The underlying RemoteBrowser instance
   * @private
   */
  private browser: RemoteBrowser;

  /**
   * Logger instance for browser-related logging
   * @private
   */
  private logger: Logger;

  /**
   * Creates an instance of AIOBrowser
   * @param {AIOBrowserOptions} options - Configuration options
   */
  constructor(cdpUrl: string, logger?: Logger) {
    this.logger = (logger ?? defaultLogger).spawn('[AIOBrowser]');
    this.browser = new RemoteBrowser({
      wsEndpoint: cdpUrl,
      logger: this.logger,
    });
    this.logger.info('AIOBrowser constructed with cdpUrl:', cdpUrl);
  }

  /**
   * Launches the browser
   * @param {LaunchOptions} [options] - Browser launch configuration options
   * @returns {Promise<void>} Promise that resolves when browser is launched
   */
  async launch(options?: LaunchOptions): Promise<void> {
    this.logger.info('Launching browser with options:', options);
    try {
      await this.browser.launch(options);
      this.logger.success('Browser launched successfully');
    } catch (error) {
      this.logger.error('Failed to launch browser:', error);
      throw error;
    }
  }

  /**
   * Closes the browser instance
   * @returns {Promise<void>} Promise that resolves when browser is closed
   */
  async close(): Promise<void> {
    this.logger.info('Closing browser');
    try {
      await this.browser.close();
      this.logger.success('Browser closed successfully');
    } catch (error) {
      this.logger.error('Failed to close browser:', error);
      throw error;
    }
  }

  /**
   * Creates a new page in the browser
   * @returns {Promise<Page>} Promise resolving to the new page instance
   */
  async createPage(): Promise<Page> {
    this.logger.info('Creating new page');
    try {
      const page = await this.browser.createPage();
      this.logger.success('New page created successfully');
      return page;
    } catch (error) {
      this.logger.error('Failed to create new page:', error);
      throw error;
    }
  }

  public async handleNavigate(inputs: Record<string, string>): Promise<void> {
    const page = await this.getActivePage();
    let { url } = inputs;
    // If the url does not start with http:// or If the url does not start with http:// or URL_ADDRESS automatically add https://
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    this.logger.info(`Navigating to: ${url}`);
    await page.goto(url, {
      waitUntil: [], // Wait for no event
    });
    this.logger.info('Navigation completed');
  }

  public async handleNavigateBack(): Promise<void> {
    const page = await this.getActivePage();
    this.logger.info(`handleNavigateBack`);
    await page.goBack();
    this.logger.info('handleNavigateBack completed');
  }

  /**
   * Gets the URL of the currently active page
   * @returns {Promise<string>} Promise resolving to the URL of the active page
   */
  async getActiveUrl(): Promise<string> {
    this.logger.info('Getting active page URL');
    try {
      // Reuse getActivePage logic to find the active page
      const activePage = await this.getActivePage();
      const url = activePage.url();
      this.logger.success(`Retrieved URL from active page: ${url}`);
      return url;
    } catch (error) {
      this.logger.error('Failed to get active page URL:', error);
      return '';
    }
  }

  /**
   * Gets the currently active page
   * @returns {Promise<Page>} Promise resolving to the active page instance
   */
  async getActivePage(): Promise<Page> {
    this.logger.info('Getting active page');
    const pages = await this.browser.getBrowser().pages();
    try {
      // First try to find a visible page without waiting
      for (const page of pages) {
        try {
          // Check visibility state directly without waiting with timeout
          const visibilityState = await Promise.race([
            page.evaluate(() => document.visibilityState),
            new Promise<string>((_, reject) => {
              setTimeout(() => reject(new Error('Visibility check timed out after 3s')), 3000);
            }),
          ]);
          if (visibilityState === 'visible') {
            this.logger.success('Active visible page retrieved successfully (direct check)');
            return page;
          }
        } catch (evalError) {
          this.logger.warn('Warning: checking page visibility directly:', evalError);
          // Continue to next page if direct check fails
          continue;
        }
      }

      // If no visible page found with direct check, try with waitForFunction but increased timeout
      for (const page of pages) {
        try {
          // Check if the page is visible with increased timeout
          const isVisible = await page.waitForFunction(
            () => {
              return document.visibilityState === 'visible';
            },
            {
              timeout: 3000, // Increased from 1000ms to 3000ms
            },
          );
          if (isVisible) {
            this.logger.success('Active visible page retrieved successfully');
            return page;
          }
        } catch (waitError) {
          this.logger.warn(`Visibility check timed out for page: ${page.url()}`);
          // Continue to next page if this one times out
          continue;
        }
      }
      this.logger.success('Active original page retrieved successfully');
      return this.browser.getActivePage();
    } catch (error) {
      this.logger.error('Failed to get active page:', error);
      throw error;
    }
  }

  /**
   * Evaluates a function in a new page context
   * @template T - Array of parameters to pass to the page function
   * @template R - Return type of the page function
   * @param {EvaluateOnNewPageOptions<T, R>} options - Evaluation options
   * @returns {Promise<R | null>} Promise resolving to the function result or null
   */
  async evaluateOnNewPage<T extends unknown[], R>(
    options: EvaluateOnNewPageOptions<T, R>,
  ): Promise<R | null> {
    this.logger.info('Evaluating function on new page with URL:', options.url);
    try {
      const result = await this.browser.evaluateOnNewPage(options);
      this.logger.success('Function evaluated successfully on new page');
      return result;
    } catch (error) {
      this.logger.error('Failed to evaluate function on new page:', error);
      throw error;
    }
  }

  /**
   * Checks if the browser instance is active
   * @returns {Promise<boolean>} True if browser is active, false otherwise
   */
  async isBrowserAlive(): Promise<boolean> {
    try {
      // Access the protected method through type assertion
      return await (this.browser as { isBrowserAlive(): Promise<boolean> }).isBrowserAlive();
    } catch (error) {
      this.logger.error('Error checking if browser is alive:', error);
      return false;
    }
  }

  /**
   * Gets the underlying RemoteBrowser instance
   * @returns {AIOBrowser} The AIOBrowser instance
   */
  static async create(options: AIOBrowserOptions): Promise<AIOBrowser> {
    const aioClient = new AioClient({
      baseUrl: options.baseURl,
    });
    const cdpVersionResponse = await aioClient?.cdpVersion();
    const cdpVersion: CDPVersionResp = (cdpVersionResponse?.data ||
      cdpVersionResponse) as unknown as CDPVersionResp;
    const cdpUrl = cdpVersion?.webSocketDebuggerUrl;
    return new AIOBrowser(cdpUrl, options.logger);
  }
}
