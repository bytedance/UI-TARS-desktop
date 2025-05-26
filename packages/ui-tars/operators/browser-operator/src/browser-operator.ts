/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LocalBrowser } from '@agent-infra/browser';
import { ConsoleLogger, Logger, defaultLogger } from '@agent-infra/logger';
import { Operator, parseBoxToScreenCoords } from '@ui-tars/sdk/core';
import type {
  Page,
  KeyInput,
  BrowserType,
  BrowserInterface,
} from '@agent-infra/browser';
import type {
  ScreenshotOutput,
  ExecuteParams,
  ExecuteOutput,
} from '@ui-tars/sdk/core';
import { BrowserOperatorOptions, SearchEngine } from './types';
import { UIHelper } from './ui-helper';
import { BrowserFinder } from '@agent-infra/browser';

import { KEY_MAPPINGS } from './key-map';
import { shortcuts } from './shortcuts';

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

  private showWaterFlowEffect = true;

  private deviceScaleFactor?: number;

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

    if (options.showWaterFlow === false) {
      this.showWaterFlowEffect = false;
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
   * Sets whether to show the water flow effect during screenshots
   * @param enable Whether to enable the water flow effect
   */
  public setShowWaterFlow(enable: boolean): void {
    this.showWaterFlowEffect = enable;
    this.logger.info(`Water flow effect ${enable ? 'enabled' : 'disabled'}`);
  }

  /**
   * Takes a screenshot of the current browser viewport
   * @returns Promise resolving to screenshot data
   */
  public async screenshot(): Promise<ScreenshotOutput> {
    this.logger.info('Starting screenshot...');

    if (this.showWaterFlowEffect) {
      this.uiHelper.showWaterFlow();
    }

    const page = await this.getActivePage();

    try {
      // Get deviceScaleFactor
      const deviceScaleFactor = await this.getDeviceScaleFactor();
      this.logger.info('DeviceScaleFactor:', deviceScaleFactor);

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
        // https://github.com/puppeteer/puppeteer/issues/7043
        captureBeyondViewport: false,
        encoding: 'base64',
        type: 'jpeg',
        quality: 75,
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
        scaleFactor: deviceScaleFactor || 1,
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

    const deviceScaleFactor = await this.getDeviceScaleFactor();
    const coords = parseBoxToScreenCoords({
      boxStr: startBoxStr,
      screenWidth,
      screenHeight,
    });
    const startX = coords.x ? coords.x / deviceScaleFactor : null;
    const startY = coords.y ? coords.y / deviceScaleFactor : null;

    this.logger.info(`Parsed coordinates: (${startX}, ${startY})`);
    this.logger.info(`Executing action: ${action_type}`);

    try {
      await this.getActivePage();

      switch (action_type) {
        case 'drag':
          await this.handleDrag(
            action_inputs,
            deviceScaleFactor,
            screenWidth,
            screenHeight,
          );
          break;

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

        case 'press':
          await this.handlePress(action_inputs);
          break;

        case 'release':
          await this.handleRelease(action_inputs);
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

    return {
      // Hand it over to the upper layer to avoid redundancy
      // @ts-expect-error fix type later
      startX,
      startY,
      action_inputs,
    };
  }

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
    await page.keyboard.type(stripContent, { delay: 20 + Math.random() * 30 });

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
      throw new Error(`No hotkey specified`);
    }

    this.logger.info(`Executing hotkey: ${keyStr}`);

    const keys = keyStr.split(/[\s+]/);
    const normalizedKeys: KeyInput[] = keys.map((key: string) => {
      const lowercaseKey = key.toLowerCase();
      const keyInput = KEY_MAPPINGS[lowercaseKey];

      if (keyInput) {
        return keyInput;
      }

      throw new Error(`Unsupported key: ${key}`);
    });

    this.logger.info(`Normalized keys:`, normalizedKeys);

    await shortcuts(page, normalizedKeys, this.options.browserType);

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

  private async handlePress(inputs: Record<string, any>) {
    const page = await this.getActivePage();

    const keyStr = inputs?.key;
    if (!keyStr) {
      this.logger.warn('No key specified for press');
      throw new Error(`No key specified for press`);
    }

    this.logger.info(`Pressing key: ${keyStr}`);

    const keys = keyStr.split(/[\s+]/);
    const normalizedKeys: KeyInput[] = keys.map((key: string) => {
      const lowercaseKey = key.toLowerCase();
      const keyInput = KEY_MAPPINGS[lowercaseKey];

      if (keyInput) {
        return keyInput;
      }

      throw new Error(`Unsupported key: ${key}`);
    });

    this.logger.info(`Normalized keys for press:`, normalizedKeys);

    // Only press the keys
    for (const key of normalizedKeys) {
      await page.keyboard.down(key);
      await this.delay(50); // 添加小延迟确保按键稳定
    }

    this.logger.info('Press operation completed');
  }

  private async handleRelease(inputs: Record<string, any>) {
    const page = await this.getActivePage();

    const keyStr = inputs?.key;
    if (!keyStr) {
      this.logger.warn('No key specified for release');
      throw new Error(`No key specified for release`);
    }

    this.logger.info(`Releasing key: ${keyStr}`);

    const keys = keyStr.split(/[\s+]/);
    const normalizedKeys: KeyInput[] = keys.map((key: string) => {
      const lowercaseKey = key.toLowerCase();
      const keyInput = KEY_MAPPINGS[lowercaseKey];

      if (keyInput) {
        return keyInput;
      }

      throw new Error(`Unsupported key: ${key}`);
    });

    this.logger.info(`Normalized keys for release:`, normalizedKeys);

    // Release the keys
    for (const key of normalizedKeys) {
      await page.keyboard.up(key);
      await this.delay(50); // 添加小延迟确保按键稳定
    }

    // For hotkey combinations that may trigger navigation,
    // wait for navigation to complete
    const navigationKeys = ['Enter', 'F5'];
    if (normalizedKeys.some((key: string) => navigationKeys.includes(key))) {
      this.logger.info('Waiting for possible navigation after key release');
      await this.waitForPossibleNavigation(page);
    } else {
      await this.delay(500);
    }

    this.logger.info('Release operation completed');
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

  private async handleDrag(
    inputs: Record<string, any>,
    deviceScaleFactor: number,
    screenWidth: number,
    screenHeight: number,
  ) {
    const page = await this.getActivePage();

    // Get start and end points from inputs
    const startBoxStr = inputs.start_box || '';
    const endBoxStr = inputs.end_box || '';

    if (!startBoxStr || !endBoxStr) {
      throw new Error('Missing start_point or end_point for drag operation');
    }

    // Parse coordinates
    const startCoords = parseBoxToScreenCoords({
      boxStr: startBoxStr,
      screenWidth,
      screenHeight,
    });
    const endCoords = parseBoxToScreenCoords({
      boxStr: endBoxStr,
      screenWidth,
      screenHeight,
    });

    // Adjust for device scale factor
    const startX = startCoords.x ? startCoords.x / deviceScaleFactor : null;
    const startY = startCoords.y ? startCoords.y / deviceScaleFactor : null;
    const endX = endCoords.x ? endCoords.x / deviceScaleFactor : null;
    const endY = endCoords.y ? endCoords.y / deviceScaleFactor : null;

    if (!startX || !startY || !endX || !endY) {
      throw new Error('Invalid coordinates for drag operation');
    }

    this.logger.info(
      `Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`,
    );

    try {
      // Show drag indicators
      await this.uiHelper?.showDragIndicator(startX, startY, endX, endY);
      await this.delay(300);

      // Perform the drag operation
      await page.mouse.move(startX, startY);
      await this.delay(100);
      await page.mouse.down();

      // Perform the drag movement in steps for a more natural drag
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const stepX = startX + ((endX - startX) * i) / steps;
        const stepY = startY + ((endY - startY) * i) / steps;
        await page.mouse.move(stepX, stepY);
        await this.delay(30); // Short delay between steps
      }

      await this.delay(100);
      await page.mouse.up();

      await this.delay(800);
      this.logger.info('Drag completed');
    } catch (error) {
      this.logger.error('Drag operation failed:', error);
      throw error;
    }
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

  private async getDeviceScaleFactor() {
    if (this.deviceScaleFactor) {
      return this.deviceScaleFactor;
    }

    this.logger.info('Getting deviceScaleFactor info...');
    const page = await this.getActivePage();

    const scaleFactor = page.viewport()?.deviceScaleFactor;
    if (scaleFactor) {
      this.deviceScaleFactor = scaleFactor;
      return scaleFactor;
    }

    const devicePixelRatio = await page.evaluate(() => window.devicePixelRatio);
    if (devicePixelRatio) {
      this.deviceScaleFactor = devicePixelRatio;
      return devicePixelRatio;
    }

    throw Error('Get deviceScaleFactor failed.');
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
  private static browserPath: string;
  private static browserType: BrowserType;
  private static logger: Logger | null = null;

  private constructor(options: BrowserOperatorOptions) {
    super(options);
  }

  /**
   * Check whether the local environment has a browser available
   * @returns {boolean}
   */
  public static hasBrowser(browser?: BrowserType): boolean {
    try {
      if (this.browserPath) {
        return true;
      }

      if (!this.logger) {
        this.logger = new ConsoleLogger('[DefaultBrowserOperator]');
      }

      const browserFinder = new BrowserFinder(this.logger);
      const browserData = browserFinder.findBrowser(browser);
      this.browserPath = browserData.path;
      this.browserType = browserData.type;

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
    searchEngine = 'google' as SearchEngine,
  ): Promise<DefaultBrowserOperator> {
    if (!this.logger) {
      this.logger = new ConsoleLogger('[DefaultBrowserOperator]');
    }

    if (this.browser) {
      const isAlive = await this.browser.isBrowserAlive();
      if (!isAlive) {
        this.browser = null;
        this.instance = null;
      }
    }

    if (!this.browser) {
      this.browser = new LocalBrowser({ logger: this.logger });
      await this.browser.launch({
        executablePath: this.browserPath,
        browserType: this.browserType,
      });
    }

    if (!this.instance) {
      this.instance = new DefaultBrowserOperator({
        browser: this.browser,
        browserType: this.browserType,
        logger: this.logger,
        highlightClickableElements: highlight,
        showActionInfo: showActionInfo,
      });
    }

    if (!isCallUser) {
      const openingPage = await this.browser?.createPage();
      const searchEngineUrls = {
        [SearchEngine.GOOGLE]: 'https://www.google.com/',
        [SearchEngine.BING]: 'https://www.bing.com/',
        [SearchEngine.BAIDU]: 'https://www.baidu.com/',
      };
      const targetUrl = searchEngineUrls[searchEngine];
      await openingPage?.goto(targetUrl, {
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
