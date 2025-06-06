/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as puppeteer from 'puppeteer-core';
import { Logger, defaultLogger } from '@agent-infra/logger';
import {
  BrowserInterface,
  EvaluateOnNewPageOptions,
  LaunchOptions,
  Page,
} from './types';

/**
 * Configuration options for the BaseBrowser class
 * @interface BaseBrowserOptions
 * @property {Logger} [logger] - Custom logger instance to use for browser logging
 */
export interface BaseBrowserOptions {
  logger?: Logger;
}

/**
 * Abstract base class that implements common browser automation functionality
 * Provides a foundation for specific browser implementations with shared capabilities
 * @abstract
 * @implements {BrowserInterface}
 */
export abstract class BaseBrowser implements BrowserInterface {
  /**
   * The underlying Puppeteer browser instance
   * @protected
   */
  protected browser: puppeteer.Browser | null = null;

  /**
   * Logger instance for browser-related logging
   * @protected
   */
  protected logger: Logger;

  /**
   * Reference to the currently active browser page
   * @protected
   */
  protected activePage: Page | null = null;

  /**
   * Creates an instance of BaseBrowser
   * @param {BaseBrowserOptions} [options] - Configuration options
   */
  constructor(options?: BaseBrowserOptions) {
    this.logger = options?.logger ?? defaultLogger;
    this.logger.info('Browser Options:', options);
  }

  /**
   * Check if the browser instance is active and responding
   * @returns {Promise<boolean>} True if browser is active, false otherwise
   */
  async isBrowserAlive(): Promise<boolean> {
    if (!this.browser) {
      return false;
    }

    try {
      // Try to get browser version to check if it's still responding
      const version = await this.browser.version();
      this.logger.info('Browser version:', version);
      return true;
    } catch (error) {
      this.logger.warn('Browser instance is no longer active:', error);
      this.browser = null;
      return false;
    }
  }

  /**
   * Get the underlying Puppeteer browser instance
   * @throws Error if browser is not launched

   * @returns {puppeteer.Browser} Puppeteer browser instance
   */
  getBrowser(): puppeteer.Browser {
    if (!this.browser) {
      throw new Error('Browser not launched');
    }
    return this.browser;
  }

  /**
   * Sets up listeners for browser page events
   * Tracks page creation and updates active page reference
   * @protected
   */
  protected async setupPageListener() {
    if (!this.browser) return;

    this.browser.on('targetcreated', async (target) => {
      const page = await target.page();
      if (page) {
        this.logger.info('New page created:', await page.url());
        this.activePage = page;

        page.once('close', () => {
          if (this.activePage === page) {
            this.activePage = null;
          }
        });

        page.once('error', () => {
          if (this.activePage === page) {
            this.activePage = null;
          }
        });
      }
    });
  }

  /**
   * Launches the browser with specified options
   * @abstract
   * @param {LaunchOptions} [options] - Browser launch configuration options
   * @returns {Promise<void>} Promise that resolves when browser is launched
   */
  abstract launch(options?: LaunchOptions): Promise<void>;

  /**
   * Closes the browser instance and cleans up resources
   * @returns {Promise<void>} Promise that resolves when browser is closed
   * @throws {Error} If browser fails to close properly
   */
  async close(): Promise<void> {
    this.logger.info('Closing browser');
    try {
      await this.browser?.close();
      this.browser = null;
      this.logger.success('Browser closed successfully');
    } catch (error) {
      this.logger.error('Failed to close browser:', error);
      throw error;
    }
  }

  /**
   * Creates a new page, navigates to the specified URL, executes a function in the page context, and returns the result
   * This method is inspired and modified from https://github.com/egoist/local-web-search/blob/04608ed09aa103e2fff6402c72ca12edfb692d19/src/browser.ts#L74
   * @template T - Type of parameters passed to the page function
   * @template R - Return type of the page function
   * @param {EvaluateOnNewPageOptions<T, R>} options - Configuration options for the page evaluation
   * @returns {Promise<R | null>} Promise resolving to the result of the page function or null
   * @throws {Error} If page creation or evaluation fails
   */
  async evaluateOnNewPage<T extends any[], R>(
    options: EvaluateOnNewPageOptions<T, R>,
  ): Promise<R | null> {
    const {
      url,
      pageFunction,
      pageFunctionParams,
      beforePageLoad,
      afterPageLoad,
      beforeSendResult,
      waitForOptions,
    } = options;
    const page = await this.browser!.newPage();
    try {
      await beforePageLoad?.(page);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        ...waitForOptions,
      });
      await afterPageLoad?.(page);
      const _window = await page.evaluateHandle(() => window);
      const result = await page.evaluate(
        pageFunction,
        _window,
        ...pageFunctionParams,
      );
      await beforeSendResult?.(page, result);
      await _window.dispose();
      await page.close();
      return result;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Creates a new browser page
   * @returns {Promise<Page>} Promise resolving to the newly created page
   * @throws {Error} If browser is not launched or page creation fails
   */
  async createPage(): Promise<Page> {
    if (!this.browser) {
      this.logger.error('No active browser');
      throw new Error('Browser not launched');
    }

    const page = await this.browser.newPage();
    return page;
  }

  /**
   * Gets the currently active page or finds an active page if none is currently tracked
   * If no active pages exist, creates a new page
   * @returns {Promise<Page>} Promise resolving to the active page
   * @throws {Error} If browser is not launched or no active page can be found/created
   */
  async getActivePage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not launched');
    }

    // If activePage exists and is still available, return directly
    if (this.activePage) {
      try {
        // Verify that the page is still available
        await this.activePage.evaluate(() => document.readyState);
        return this.activePage;
      } catch (e) {
        this.logger.warn('Active page no longer available:', e);
        this.activePage = null;
      }
    }

    // Get all pages and find the last active page
    const pages = await this.browser.pages();

    if (pages.length === 0) {
      this.activePage = await this.createPage();
      return this.activePage;
    }

    // Find the last responding page
    for (let i = pages.length - 1; i >= 0; i--) {
      const page = pages[i];
      try {
        await page.evaluate(() => document.readyState);
        this.activePage = page;
        return page;
      } catch (e) {
        continue;
      }
    }

    throw new Error('No active page found');
  }
}
