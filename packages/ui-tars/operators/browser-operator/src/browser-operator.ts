/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { BrowserInterface, Page } from '@agent-infra/browser';
import { LocalBrowser } from '@agent-infra/browser';
import { ConsoleLogger, Logger, defaultLogger } from '@agent-infra/logger';
import { Operator, parseBoxToScreenCoords } from '@ui-tars/sdk/core';
import type {
  ScreenshotOutput,
  ExecuteParams,
  ExecuteOutput,
} from '@ui-tars/sdk/core';
import { BrowserOperatorOptions } from './types';
import { UIHelper } from './ui-helper';
import { BrowserFinder } from '@agent-infra/browser';

const KEY_MAPPINGS: Record<string, string> = {
  enter: 'Enter',
  tab: 'Tab',
  escape: 'Escape',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
  backspace: 'Backspace',
  delete: 'Delete',
  f1: 'F1',
  f2: 'F2',
  f3: 'F3',
  f4: 'F4',
  f5: 'F5',
  f6: 'F6',
  f7: 'F7',
  f8: 'F8',
  f9: 'F9',
  f10: 'F10',
  f11: 'F11',
  f12: 'F12',
};

/**
 * BrowserOperator class that extends the base Operator
 * Provides functionality to control a browser instance for UI automation
 */
export class BrowserOperator extends Operator {
  private browser: BrowserInterface;

  private currentPage: Page | null = null;

  private logger: Logger;

  private uiHelper: UIHelper;

  private highlightClickableElements = true;

  private showActionInfo = true;

  /**
   * Creates a new BrowserOperator instance
   * @param options Configuration options for the browser operator
   */
  constructor(private options: BrowserOperatorOptions) {
    super();
    this.browser = this.options.browser;

    this.logger = (this.options.logger ?? defaultLogger).spawn(
      '[BrowserOperator]',
    );

    // Initialize UIHelper with a function that gets the active page
    this.uiHelper = new UIHelper(() => this.getActivePage(), this.logger);

    if (options.highlightClickableElements === false) {
      this.highlightClickableElements = false;
    }

    if (options.showActionInfo === false) {
      this.showActionInfo = false;
    }
  }

  /**
   * Gets the currently active browser page
   * @returns Promise resolving to the active Page object
   * @throws Error if no active page is found
   */
  private async getActivePage(): Promise<Page> {
    const page = await this.browser.getActivePage();
    if (!page) {
      throw new Error('No active page found');
    }
    if (this.currentPage !== page) {
      this.currentPage = page;
    }
    return page;
  }

  public setHighlightClickableElements(enable: boolean): void {
    this.highlightClickableElements = enable;
    this.logger.info(
      `Clickable elements highlighting ${enable ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Takes a screenshot of the current browser viewport
   * @returns Promise resolving to screenshot data
   */
  public async screenshot(): Promise<ScreenshotOutput> {
    this.logger.info('Starting screenshot...');

    this.uiHelper.showWaterFlow();

    const page = await this.getActivePage();

    try {
      // Get viewport info
      this.logger.info('Getting viewport info...');
      const viewport = page.viewport();
      if (!viewport) {
        throw new Error(`Missing viewport`);
      }
      this.logger.info(`Viewport: ${JSON.stringify(viewport)}`);

      // Highlight clickable elements before taking screenshot if enabled
      if (this.highlightClickableElements) {
        this.logger.info('Highlighting clickable elements...');
        await this.uiHelper.highlightClickableElements();
        // Give the browser a moment to render the highlights
        await this.delay(300);
      }

      // Take screenshot of visible area only
      this.logger.info('Taking screenshot...');
      const startTime = Date.now();

      // Take screenshot
      await this.uiHelper.cleanupTemporaryVisuals();
      const buffer = await page.screenshot({
        encoding: 'base64',
        fullPage: false, // Capture only the visible area
      });

      const duration = Date.now() - startTime;
      this.logger.info(`Screenshot taken in ${duration}ms`);

      // Remove highlights after taking screenshot
      // if (this.highlightClickableElements) {
      //   await this.uiHelper.removeClickableHighlights();
      // }

      const output: ScreenshotOutput = {
        base64: buffer.toString(),
        scaleFactor: viewport.deviceScaleFactor || 1,
      };

      this.logger.info('Screenshot Info', {
        ...output,
        base64: '<base64>',
      });

      try {
        await this.options.onScreenshot?.(output, page);
      } catch (error) {
        this.logger.error('Error in onScreenshot callback:', error);
      }
      return output;
    } catch (error) {
      // Ensure highlights are removed even if screenshot fails
      if (this.highlightClickableElements) {
        await this.uiHelper.removeClickableHighlights();
      }
      this.logger.error('Screenshot failed:', error);
      throw error;
    }
  }

  /**
   * Executes a specified action based on the parsed prediction
   * @param params Parameters containing action details
   * @returns Promise resolving to execution output
   */
  public async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    this.logger.info('Starting execute with params:', params);

    const { parsedPrediction, screenWidth, screenHeight } = params;

    // Show action info in UI
    if (this.showActionInfo) {
      await this.uiHelper?.showActionInfo(parsedPrediction);
    }

    // Add this line to trigger plugin hook
    await this.options.onOperatorAction?.(parsedPrediction);

    const { action_type, action_inputs } = parsedPrediction;
    const startBoxStr = action_inputs?.start_box || '';

    const coords = parseBoxToScreenCoords({
      boxStr: startBoxStr,
      screenWidth,
      screenHeight,
    });

    const { x: startX, y: startY } = coords;

    this.logger.info(`Parsed coordinates: (${startX}, ${startY})`);
    this.logger.info(`Executing action: ${action_type}`);

    try {
      await this.getActivePage();

      switch (action_type) {
        case 'navigate':
          await this.handleNavigate(action_inputs);
          break;

        case 'click':
        case 'left_click':
        case 'left_single':
          if (startX && startY) await this.handleClick(startX, startY);
          else throw new Error(`Missing startX(${startX}) or startY${startX}.`);
          break;

        case 'double_click':
        case 'left_double':
          if (startX && startY) await this.handleDoubleClick(startX, startY);
          else throw new Error(`Missing startX(${startX}) or startY${startX}.`);
          break;

        case 'right_click':
          if (startX && startY) await this.handleRightClick(startX, startY);
          else throw new Error(`Missing startX(${startX}) or startY${startX}.`);
          break;

        case 'type':
          await this.handleType(action_inputs);
          await this.delay(1000);
          break;

        case 'hotkey':
          await this.handleHotkey(action_inputs);
          break;

        case 'scroll':
          await this.handleScroll(action_inputs);
          break;

        case 'wait':
          await this.delay(5000);
          break;

        case 'finished':
          if (this.options.onFinalAnswer && parsedPrediction.thought) {
            await this.options.onFinalAnswer(parsedPrediction.thought);
          }
          this.uiHelper.cleanup();
          break;

        case 'call_user':
          this.uiHelper.cleanup();
          break;

        case 'user_stop':
          this.uiHelper.cleanup();
          break;

        default:
          this.logger.warn(
            `[BrowserOperator] Unsupported action: ${action_type}`,
          );
      }
      this.logger.info(`Action ${action_type} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to execute ${action_type}:`, error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Handles a click action at the specified coordinates
   * @param x X coordinate
   * @param y Y coordinate
   */
  private async handleClick(x: number, y: number) {
    this.logger.info(`Clicking at (${x}, ${y})`);
    const page = await this.getActivePage();

    try {
      await this.uiHelper?.showClickIndicator(x, y);
      await this.delay(300);

      await page.mouse.move(x, y);
      await this.delay(100);
      await page.mouse.click(x, y);

      await this.delay(800);
      this.logger.info('Click completed');
    } catch (error) {
      this.logger.error('Click operation failed:', error);
      throw error;
    }
  }

  private async handleDoubleClick(x: number, y: number) {
    this.logger.info(`Double clicking at (${x}, ${y})`);
    const page = await this.getActivePage();

    try {
      // Show indicator first
      await this.uiHelper?.showClickIndicator(x, y);
      await this.delay(300); // 增加延时，原来是 100

      // Perform double click
      await page.mouse.move(x, y);
      await this.delay(100); // 增加延时，原来是 50
      await page.mouse.click(x, y, { clickCount: 2 });

      await this.delay(800); // 增加延时，原来是 500
      this.logger.info('Double click completed');
    } catch (error) {
      this.logger.error('Double click operation failed:', error);
      throw error;
    }
  }

  private async handleRightClick(x: number, y: number) {
    const page = await this.getActivePage();

    this.logger.info(`Right clicking at (${x}, ${y})`);

    try {
      // Show indicator first
      await this.uiHelper?.showClickIndicator(x, y);
      await this.delay(300); // 增加延时，原来是 100

      // Perform right click
      await page.mouse.move(x, y);
      await this.delay(100); // 增加延时，原来是 50
      await page.mouse.click(x, y, { button: 'right' });

      await this.delay(800); // 增加延时，原来是 500
      this.logger.info('Right click completed');
    } catch (error) {
      this.logger.error('Right click operation failed:', error);
      throw error;
    }
  }

  private async handleType(inputs: Record<string, any>) {
    const page = await this.getActivePage();

    const content = inputs.content?.trim();
    if (!content) {
      this.logger.warn('No content to type');
      return;
    }

    this.logger.info('Typing content:', content);
    const stripContent = content.replace(/\\n$/, '').replace(/\n$/, '');

    // Type each character with a faster random delay
    for (const char of stripContent) {
      await page.keyboard.type(char);
      // Random delay between 20ms and 50ms for natural typing rhythm
      await this.delay(20 + Math.random() * 30);
    }

    if (content.endsWith('\n') || content.endsWith('\\n')) {
      // Reduced pause before Enter
      await this.delay(50);

      this.logger.info('Pressing Enter after content');

      await page.keyboard.press('Enter');
      this.logger.info('Typing completed');

      await this.waitForPossibleNavigation(page);
    }
  }

  private async handleHotkey(inputs: Record<string, any>) {
    const page = await this.getActivePage();

    const keyStr = inputs?.key || inputs?.hotkey;
    if (!keyStr) {
      this.logger.warn('No hotkey specified');
      return;
    }

    this.logger.info(`Executing hotkey: ${keyStr}`);
    const normalizeKey = (key: string): string => {
      const lowercaseKey = key.toLowerCase();
      return KEY_MAPPINGS[lowercaseKey] || key;
    };

    const keys = keyStr.split(/[\s+]/);
    const normalizedKeys = keys.map(normalizeKey);
    this.logger.info(`Normalized keys:`, normalizedKeys);

    for (const key of normalizedKeys) {
      await page.keyboard.down(key);
    }
    await this.delay(100);
    for (const key of normalizedKeys.reverse()) {
      await page.keyboard.up(key);
    }

    // For hotkey combinations that may trigger navigation,
    // wait for navigation to complete
    const navigationKeys = ['Enter', 'F5'];
    if (normalizedKeys.some((key: string) => navigationKeys.includes(key))) {
      this.logger.info('Waiting for possible navigation after hotkey');
      await this.waitForPossibleNavigation(page);
    } else {
      await this.delay(500);
    }

    this.logger.info('Hotkey execution completed');
  }

  private async handleScroll(inputs: Record<string, any>) {
    const page = await this.getActivePage();

    const { direction } = inputs;
    const scrollAmount = 500;

    this.logger.info(`Scrolling ${direction} by ${scrollAmount}px`);

    switch (direction?.toLowerCase()) {
      case 'up':
        await page.mouse.wheel({ deltaY: -scrollAmount });
        break;
      case 'down':
        await page.mouse.wheel({ deltaY: scrollAmount });
        break;
      default:
        this.logger.warn(`Unsupported scroll direction: ${direction}`);
        return;
    }
    this.logger.info('Scroll completed');
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async handleNavigate(inputs: Record<string, any>): Promise<void> {
    const page = await this.getActivePage();
    const { url } = inputs;
    this.logger.info(`Navigating to: ${url}`);
    await page.goto(url, {
      waitUntil: 'networkidle0',
    });
    this.logger.info('Navigation completed');
  }

  /**
   * A helper function to wait for possible navigation to complete.
   * @param page
   */
  private async waitForPossibleNavigation(page: Page): Promise<void> {
    const navigationPromise = new Promise<void>((resolve) => {
      const onStarted = () => {
        this.logger.info('Navigation started');
        resolve();
        page.off('framenavigated', onStarted);
      };
      page.on('framenavigated', onStarted);

      setTimeout(() => {
        page.off('framenavigated', onStarted);
        resolve();
      }, 5000);
    });

    await navigationPromise;
    this.logger.info('Navigation completed or timed out');
  }

  public async cleanup(): Promise<void> {
    this.logger.info('Starting cleanup...');
    await this.uiHelper.cleanup();
    if (this.currentPage) {
      await this.currentPage.close();
      this.currentPage = null;
      this.logger.info('Page closed successfully');
    }
    this.logger.info('Cleanup completed');
  }
}

export class DefaultBrowserOperator extends BrowserOperator {
  private static instance: DefaultBrowserOperator | null = null;
  private static browser: LocalBrowser | null = null;
  private static logger: Logger | null = null;

  private constructor(options: BrowserOperatorOptions) {
    super(options);
  }

  /**
   * Check whether the local environment has a browser available
   * @returns {boolean}
   */
  public static hasBrowser(): boolean {
    try {
      const browserFinder = new BrowserFinder();
      browserFinder.findBrowser();
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error('No available browser found:', error);
      }
      return false;
    }
  }

  public static async getInstance(
    highlight = false,
    showActionInfo = false,
    isCallUser = false,
  ): Promise<DefaultBrowserOperator> {
    if (!this.instance) {
      if (!this.logger) {
        this.logger = new ConsoleLogger('[Default]');
      }

      if (!this.browser) {
        this.browser = new LocalBrowser({ logger: this.logger });
        await this.browser.launch();
      }

      this.instance = new DefaultBrowserOperator({
        browser: this.browser,
        logger: this.logger,
        highlightClickableElements: highlight,
        showActionInfo: showActionInfo,
      });
    }

    if (!isCallUser) {
      const openingPage = await this.browser?.createPage();
      await openingPage?.goto('https://www.google.com/', {
        waitUntil: 'networkidle2',
      });
    }

    this.instance.setHighlightClickableElements(highlight);

    return this.instance;
  }

  public static async destroyInstance(): Promise<void> {
    if (this.instance) {
      await this.instance.cleanup();
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.instance = null;
    }
  }
}
