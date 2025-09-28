/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalBrowser, RemoteBrowser } from '@agent-infra/browser';
import { ConsoleLogger } from '@tarko/mcp-agent';

/**
 * FIXME: remove `lastLaunchOptions`
 *
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
  private browser: RemoteBrowser | LocalBrowser | null = null;
  // FIXME: move to `@agent-infra/browser`.
  private isLaunched = false;
  private logger: ConsoleLogger;
  public lastLaunchOptions: { headless?: boolean; cdpEndpoint?: string } = {};
  private isRecoveryInProgress = false;

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
  public getBrowser(): LocalBrowser | RemoteBrowser {
    if (!this.browser) {
      this.logger.info('Creating browser instance (not launched yet)');
      if (this.lastLaunchOptions?.cdpEndpoint) {
        this.browser = new RemoteBrowser({
          logger: this.logger.spawn('RemoteBrowser'),
          cdpEndpoint: this.lastLaunchOptions.cdpEndpoint,
        });
      } else {
        this.browser = new LocalBrowser({
          logger: this.logger.spawn('LocalBrowser'),
        });
      }
    }
    return this.browser;
  }

  /**
   * Launch the browser with specified options
   */
  public async launchBrowser(
    options: { headless?: boolean; cdpEndpoint?: string } = {},
  ): Promise<void> {
    if (this.isLaunched) {
      this.logger.info('Browser already launched, skipping launch');
      return;
    }

    // Store launch options for potential recovery
    this.lastLaunchOptions = { ...options };

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
   * Check if the browser is alive and recover it if needed
   * @param autoRecover Whether to automatically recover the browser if it's not alive
   * @returns True if the browser is alive or successfully recovered, false otherwise
   */
  public async isBrowserAlive(autoRecover = false): Promise<boolean> {
    if (!this.browser || !this.isLaunched) {
      return false;
    }

    try {
      const isAlive = await this.browser.isBrowserAlive();
      if (!isAlive && autoRecover && !this.isRecoveryInProgress) {
        this.logger.warn('⚠️ Browser process is not alive, attempting recovery...');
        return await this.recoverBrowser();
      }
      return isAlive;
    } catch (error) {
      this.logger.warn(`Error checking browser status: ${error}`);
      if (autoRecover && !this.isRecoveryInProgress) {
        this.logger.warn('⚠️ Browser status check failed, attempting recovery...');
        return await this.recoverBrowser();
      }
      return false;
    }
  }

  /**
   * Recover browser after it was killed or crashed
   * @returns True if recovery was successful, false otherwise
   */
  public async recoverBrowser(): Promise<boolean> {
    if (this.isRecoveryInProgress) {
      this.logger.info('Browser recovery already in progress, waiting...');
      return false;
    }

    this.isRecoveryInProgress = true;
    this.logger.info('🔄 Attempting to recover browser instance...');

    try {
      // Reset state
      this.isLaunched = false;

      // Close existing browser if any (ignoring errors)
      try {
        if (this.browser) {
          await this.browser.close().catch(() => {});
        }
      } catch (e) {
        // Ignore errors during cleanup
      }

      // Create new browser instance
      if (this.lastLaunchOptions?.cdpEndpoint) {
        this.browser = new RemoteBrowser({
          logger: this.logger.spawn('RemoteBrowser'),
          cdpEndpoint: this.lastLaunchOptions.cdpEndpoint,
        });
      } else {
        this.browser = new LocalBrowser({
          logger: this.logger.spawn('LocalBrowser'),
        });
      }

      // Re-launch with last known options
      await this.launchBrowser(this.lastLaunchOptions);

      this.logger.success('✅ Browser successfully recovered');
      return true;
    } catch (error) {
      this.logger.error(`❌ Browser recovery failed: ${error}`);
      return false;
    } finally {
      this.isRecoveryInProgress = false;
    }
  }

  /**
   * Close all browser pages but keep the browser instance alive
   * This is useful for cleaning up between tasks without needing to relaunch the browser
   */
  public async closeAllPages(): Promise<void> {
    if (!this.browser || !this.isLaunched) {
      this.logger.info('Browser not launched, no pages to close');
      return;
    }

    try {
      this.logger.info('Closing browser pages...');
      const pages = await this.browser.getBrowser().pages();
      // Close all pages except the last one
      for (let i = 0; i < pages.length; i++) {
        if (i === pages.length - 1) {
          await pages[i].goto('about:blank');
        } else {
          await pages[i].close();
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error managing browser pages: ${error}`);
    }
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
