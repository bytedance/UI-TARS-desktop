/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalBrowser } from '@agent-infra/browser';
import { ConsoleLogger } from '@multimodal/mcp-agent';

/**
 * BrowserManager - Singleton manager for Local Browser instance
 *
 * This class implements the Singleton pattern to ensure only one browser instance
 * exists across the application. It provides:
 *
 * 1. Lazy initialization - browser only launches when first needed
 * 2. Lifecycle management - handling browser creation, verification and cleanup
 * 3. Global access - consistent access point to shared browser instance
 */
export class BrowserManager {
  private static instance: BrowserManager | null = null;
  private browser: LocalBrowser | null = null;
  private isLaunched = false;
  private logger: ConsoleLogger;

  private constructor(logger: ConsoleLogger) {
    this.logger = logger.spawn('BrowserManager');
    this.logger.info('Browser manager initialized (browser not launched yet)');
  }

  /**
   * Get the singleton instance of BrowserManager
   */
  public static getInstance(logger: ConsoleLogger): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager(logger);
    }
    return BrowserManager.instance;
  }

  /**
   * Get the browser instance, creating it if it doesn't exist
   */
  public getBrowser(): LocalBrowser {
    if (!this.browser) {
      this.logger.info('Creating browser instance (not launched yet)');
      this.browser = new LocalBrowser({
        logger: this.logger.spawn('LocalBrowser'),
      });
    }
    return this.browser;
  }

  /**
   * Launch the browser with specified options
   */
  public async launchBrowser(options: { headless?: boolean } = {}): Promise<void> {
    if (this.isLaunched) {
      this.logger.info('Browser already launched, skipping launch');
      return;
    }

    try {
      this.logger.info('🌐 Launching browser instance...');
      const browser = this.getBrowser();
      await browser.launch(options);
      // FIXME: Create new page here to avoid the mcp server browser createing
      // another browser instance, we need a better solution here.
      // const openingPage = await browser.createPage();
      // await openingPage.goto('about:blank', {
      //   waitUntil: 'networkidle2',
      // });
      this.isLaunched = true;
      this.logger.success('✅ Browser instance launched successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to launch browser: ${error}`);
      throw error;
    }
  }

  /**
   * Check if the browser is launched
   */
  public isLaunchingComplete(): boolean {
    return this.isLaunched;
  }

  /**
   * Check if the browser is alive
   */
  public async isBrowserAlive(): Promise<boolean> {
    if (!this.browser || !this.isLaunched) {
      return false;
    }
    return this.browser.isBrowserAlive();
  }

  /**
   * Close the browser instance
   */
  public async closeBrowser(): Promise<void> {
    if (this.browser && this.isLaunched) {
      try {
        this.logger.info('Closing browser instance...');
        await this.browser.close();
        this.logger.info('Browser instance closed successfully');
      } catch (error) {
        this.logger.error(`Error closing browser: ${error}`);
      } finally {
        this.isLaunched = false;
      }
    }
  }

  /**
   * Reset the browser manager state (for testing purposes)
   */
  public static resetInstance(): void {
    BrowserManager.instance = null;
  }
}
