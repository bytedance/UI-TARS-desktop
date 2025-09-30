/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Logger, defaultLogger } from '@agent-infra/logger';
import { Page, BaseBrowser } from '@agent-infra/browser';
import { Hotkey, getEnvInfo } from '@agent-infra/puppeteer-enhance';

import type {
  ScreenshotOutput,
  ExecuteParams,
  ExecuteOutput,
  SupportedActionType,
  BaseAction,
  Coordinates,
} from '@gui-agent/shared/types';
import { Operator, ScreenContext } from '@gui-agent/shared/base';
import { sleep } from '@gui-agent/shared/utils';

import { UIHelper } from './ui-helper';
import { BrowserOperatorOptions } from './types';

/**
 * BrowserOperator class that extends the base Operator
 * Provides functionality to control a browser instance for UI automation
 */
export class BrowserOperator extends Operator {
  protected logger: Logger;
  protected browser: BaseBrowser;

  // ui helper and related configs
  private uiHelper: UIHelper;
  private showActionInfo = true;
  private showWaterFlowEffect = true;
  private highlightClickableElements = true;

  // device scale factor and screen context
  private deviceScaleFactor?: number;
  private currentScreenContext?: ScreenContext;

  // current page and hotkey executor
  private currentPage: Page | null = null;
  private hotkeyExecutor?: Hotkey;

  /**
   * Creates a new BrowserOperator instance
   * @param options Configuration options for the browser operator
   */
  constructor(private options: BrowserOperatorOptions) {
    super();
    this.browser = this.options.browser;
    this.logger = (this.options.logger ?? defaultLogger).spawn('[BrowserOperator]');

    // Initialize UIHelper with a function that gets the active page
    this.uiHelper = new UIHelper(() => this.getActivePage(), this.logger);
    if (options.showActionInfo === false) this.showActionInfo = false;
    if (options.showWaterFlow === false) this.showWaterFlowEffect = false;
    if (options.highlightClickableElements === false) this.highlightClickableElements = false;
  }

  /**
   * Sets whether to show action information overlay on the screen
   * @param enable Whether to enable showing action information
   */
  public setShowActionInfo(enable: boolean): void {
    this.showActionInfo = enable;
    this.logger.info(`Show Action info ${enable ? 'enabled' : 'disabled'}`);
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
   * Sets whether to highlight clickable elements on the screen
   * @param enable Whether to enable highlighting clickable elements
   */
  public setHighlightClickableElements(enable: boolean): void {
    this.highlightClickableElements = enable;
    this.logger.info(`Clickable elements highlighting ${enable ? 'enabled' : 'disabled'}`);
  }

  /**
   * Cleans up resources used by the BrowserOperator
   * Closes the current page and performs cleanup operations
   */
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

  public async destroyInstance(): Promise<void> {
    this.logger.debug('destroyInstance: start');
    await this.cleanup();
    if (this.browser) {
      await this.browser.close();
    }
  }

  protected async initialize(): Promise<void> {
    this.logger.info('initialize: getting screen context info...');

    const { width, height } = await this.getScreenRect();
    const scaleFactor = await this.getDeviceScaleFactor();

    this.currentScreenContext = {
      screenWidth: width,
      screenHeight: height,
      scaleX: scaleFactor ?? 1,
      scaleY: scaleFactor ?? 1,
    };
  }

  protected supportedActions(): Array<SupportedActionType> {
    return [
      'drag',
      'navigate',
      'navigate_back',
      'click',
      // 'left_click',
      // 'left_single',
      'double_click',
      // 'left_double',
      'right_click',
      'type',
      'hotkey',
      'press',
      'release',
      'scroll',
      'wait',
      'finished',
      'call_user',
      // 'user_stop',
    ];
  }

  protected screenContext(): ScreenContext {
    if (this.currentScreenContext) {
      return this.currentScreenContext;
    }
    throw Error('Get screenContext failed.');
  }

  /**
   * Takes a screenshot of the current browser viewport
   * @returns Promise resolving to screenshot data
   */
  protected async screenshot(): Promise<ScreenshotOutput> {
    this.logger.info('Starting screenshot...');

    if (this.showWaterFlowEffect) await this.uiHelper.showWaterFlow();

    const page = await this.getActivePage();

    try {
      // Highlight clickable elements before taking screenshot if enabled
      if (this.highlightClickableElements) {
        this.logger.info('Highlighting clickable elements...');
        await this.uiHelper.highlightClickableElements();
        // Give the browser a moment to render the highlights
        await sleep(300);
      }

      // Take screenshot of visible area only
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

      const output: ScreenshotOutput = {
        status: 'success',
        base64: buffer.toString(),
        url: (await this.getMeta()).url,
      };

      this.logger.info('Screenshot Info', {
        ...output,
        base64: '<base64>',
      });

      return output;
    } catch (error) {
      this.logger.error('Screenshot failed:', error);
      throw error;
    } finally {
      // Remove highlights after taking screenshot
      if (this.highlightClickableElements) {
        await this.uiHelper.removeClickableHighlights();
      }
      if (this.showWaterFlowEffect) await this.uiHelper.hideWaterFlow();
    }
  }

  protected async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { actions, reasoningContent } = params;
    for (const action of actions) {
      if (this.showActionInfo) {
        this.logger.info('Show action info');
        await this.uiHelper?.showActionInfo(action, reasoningContent ?? '');
      }
      this.logger.info('Execute action', action);
      await this.singleActionExecutor(action);
    }
    return {
      status: 'success',
    };
  }

  /**
   * Executes a specified action based on the parsed prediction
   * @param action Parameters containing action details
   * @returns Promise resolving to execution output
   */
  private async singleActionExecutor(action: BaseAction): Promise<ExecuteOutput> {
    this.logger.info('Starting execute with action:', JSON.stringify(action));

    const { type: action_type, inputs: action_inputs } = action;

    this.logger.info(`Executing action: ${action_type}`);

    try {
      await this.getActivePage();

      switch (action_type) {
        case 'drag':
          await this.handleDrag(action_inputs);
          break;
        case 'navigate':
          await this.handleNavigate(action_inputs);
          break;
        case 'navigate_back':
          await this.handleNavigateBack();
          break;
        case 'click':
        case 'left_click':
        case 'left_single':
          await this.handleClick(action_inputs);
          break;
        case 'double_click':
        case 'left_double':
          await this.handleDoubleClick(action_inputs);
          break;
        case 'right_click':
          await this.handleRightClick(action_inputs);
          break;
        case 'type':
          await this.handleType(action_inputs);
          await sleep(1000);
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
          await sleep(action_inputs.time * 1000 || 5000);
          break;
        case 'finished':
          this.uiHelper.cleanup();
          break;
        case 'call_user':
          this.uiHelper.cleanup();
          break;
        default:
          this.logger.warn(`Unsupported action: ${action_type}`);
      }
      this.logger.info(`Action ${action_type} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to execute ${action_type}:`, error);
      await this.cleanup();
      throw error;
    }

    return {
      status: 'success',
    };
  }

  private async handleClick(inputs: Record<string, any>) {
    if (!inputs.point) {
      throw new Error(`Missing point for click.`);
    }

    const { realX: x, realY: y } = await this.calculateRealCoords(inputs.point);
    this.logger.info(`Clicking at (${x}, ${y})`);

    const page = await this.getActivePage();
    try {
      await this.uiHelper?.showClickIndicator(x, y);
      await sleep(300);

      await page.mouse.move(x, y);
      await sleep(100);
      await page.mouse.click(x, y);

      await sleep(800);
      this.logger.info('Click completed');
    } catch (error) {
      this.logger.error('Click operation failed:', error);
      throw error;
    }
  }

  private async handleDoubleClick(inputs: Record<string, any>) {
    if (!inputs.point) {
      throw new Error(`Missing point for double click.`);
    }

    const { realX: x, realY: y } = await this.calculateRealCoords(inputs.point);
    this.logger.info(`Double clicking at (${x}, ${y})`);

    const page = await this.getActivePage();
    try {
      // Show indicator first
      await this.uiHelper?.showClickIndicator(x, y);
      await sleep(300);

      // Perform double click
      await page.mouse.move(x, y);
      await sleep(100);
      await page.mouse.click(x, y, { clickCount: 2 });

      await sleep(800);
      this.logger.info('Double click completed');
    } catch (error) {
      this.logger.error('Double click operation failed:', error);
      throw error;
    }
  }

  private async handleRightClick(inputs: Record<string, any>) {
    if (!inputs.point) {
      throw new Error(`Missing point for right click.`);
    }

    const { realX: x, realY: y } = await this.calculateRealCoords(inputs.point);
    this.logger.info(`Right clicking at (${x}, ${y})`);

    const page = await this.getActivePage();
    try {
      // Show indicator first
      await this.uiHelper?.showClickIndicator(x, y);
      await sleep(300);

      // Perform right click
      await page.mouse.move(x, y);
      await sleep(100);
      await page.mouse.click(x, y, { button: 'right' });

      await sleep(800);
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
      await sleep(50);

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

    try {
      // @ts-ignore
      await (await this.getHotkeyExecutor()).press(page as unknown as Page, keyStr);
    } catch (error) {
      this.logger.error('Hotkey execution failed:', error);
    }
  }

  private async handlePress(inputs: Record<string, any>) {
    const page = await this.getActivePage();

    const keyStr = inputs?.key;
    if (!keyStr) {
      this.logger.warn('No key specified for press');
      throw new Error(`No key specified for press`);
    }

    this.logger.info(`Pressing key: ${keyStr}`); // secretlint-disable-line

    try {
      // @ts-ignore
      await (await this.getHotkeyExecutor()).down(page as unknown as Page, keyStr);
    } catch (error) {
      this.logger.error('Press execution failed:', error);
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

    this.logger.info(`Releasing key: ${keyStr}`); // secretlint-disable-line

    try {
      // @ts-ignore
      await (await this.getHotkeyExecutor()).up(page as unknown as Page, keyStr);
    } catch (error) {
      this.logger.error('Release execution failed:', error);
    }

    this.logger.info('Release operation completed');
  }

  private async handleScroll(inputs: Record<string, any>) {
    const page = await this.getActivePage();

    const direction = inputs.direction.toLowerCase();

    if (!inputs.point) {
      throw new Error(`No point specified for scroll`);
    }
    const { realX: startX, realY: startY } = await this.calculateRealCoords(inputs.point);

    if (startX && startY) {
      this.logger.info(`Moving mouse to scroll position: (${startX}, ${startY})`);
      await page.mouse.move(startX, startY);
      await sleep(100); // Small delay to ensure mouse position is set
    }

    const { screenWidth, screenHeight, scaleX, scaleY } = await this.getScreenContext();
    const scrollAmount =
      direction === 'up' || direction === 'down'
        ? (screenHeight / scaleY) * 0.8
        : (screenWidth / scaleX) * 0.8;

    this.logger.info(`Scrolling ${direction} by ${scrollAmount}px`);

    switch (direction) {
      case 'up':
        await page.mouse.wheel({ deltaY: -scrollAmount });
        break;
      case 'down':
        await page.mouse.wheel({ deltaY: scrollAmount });
        break;
      case 'left':
        await page.mouse.wheel({ deltaX: -scrollAmount });
        break;
      case 'right':
        await page.mouse.wheel({ deltaX: scrollAmount });
        break;
      default:
        this.logger.warn(`Unsupported scroll direction: ${direction}`);
        return;
    }
    this.logger.info('Scroll completed');
  }

  private async handleNavigate(inputs: Record<string, any>): Promise<void> {
    if (!inputs.url) {
      throw new Error('No target url specified for navigation');
    }

    let { url } = inputs;
    // If the url does not start with 'http://' or 'https://', automatically add 'https://'
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    this.logger.info(`Navigating to: ${url}`);

    const page = await this.getActivePage();
    await page.goto(url, {
      waitUntil: [], // Wait for no event
    });
    this.logger.info('Navigation completed');
  }

  private async handleDrag(inputs: Record<string, any>) {
    if (!inputs.start || !inputs.end) {
      throw new Error('Missing start_point or end_point for drag operation');
    }

    const { realX: startX, realY: startY } = await this.calculateRealCoords(inputs.start);
    const { realX: endX, realY: endY } = await this.calculateRealCoords(inputs.end);

    if (!startX || !startY || !endX || !endY) {
      throw new Error('Invalid coordinates for drag operation');
    }

    try {
      const page = await this.getActivePage();

      // Show drag indicators
      await this.uiHelper?.showDragIndicator(startX, startY, endX, endY);
      await sleep(300);

      // Perform the drag operation
      await page.mouse.move(startX, startY);
      await sleep(100);
      await page.mouse.down();

      // Perform the drag movement in steps for a more natural drag
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const stepX = startX + ((endX - startX) * i) / steps;
        const stepY = startY + ((endY - startY) * i) / steps;
        await page.mouse.move(stepX, stepY);
        await sleep(30); // Short delay between steps
      }

      await sleep(100);
      await page.mouse.up();

      await sleep(800);
      this.logger.info('Drag completed');
    } catch (error) {
      this.logger.error('Drag operation failed:', error);
      throw error;
    }
  }

  private async handleNavigateBack(): Promise<void> {
    const page = await this.getActivePage();
    this.logger.info(`handleNavigateBack`);
    await page.goBack();
    this.logger.info('handleNavigateBack completed');
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

  private async getScreenRect() {
    const page = await this.getActivePage();
    const width = page.viewport()?.width;
    const height = page.viewport()?.height;
    if (!width || !height) {
      throw Error('Get screen context failed.');
    }
    this.logger.debug('getScreenRect: w, h: ', `(${width} x ${height})`);
    return { width, height };
  }

  private async getDeviceScaleFactor() {
    if (this.deviceScaleFactor) {
      return this.deviceScaleFactor;
    }

    const page = await this.getActivePage();

    const scaleFactor = page.viewport()?.deviceScaleFactor;
    if (scaleFactor) {
      this.deviceScaleFactor = scaleFactor;
      this.logger.debug('getDeviceScaleFactor: deviceScaleFactor: ', scaleFactor);
      return scaleFactor;
    }

    const devicePixelRatio = await page.evaluate(() => window.devicePixelRatio);
    if (devicePixelRatio) {
      this.deviceScaleFactor = devicePixelRatio;
      this.logger.debug('getDeviceScaleFactor: devicePixelRatio: ', devicePixelRatio);
      return devicePixelRatio;
    }

    throw Error('Get deviceScaleFactor failed.');
  }

  /**
   * Gets the currently active browser page
   * @returns Promise resolving to the active Page object
   * @throws Error if no active page is found
   */
  private async getActivePage(): Promise<Page> {
    const pages = await this.browser.getBrowser().pages();
    this.logger.info(`get active pages len: ${pages.length}`);
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
    this.logger.success('Active original page retrieved failed, fallback to active page');
    return this.browser.getActivePage();
  }

  private async getHotkeyExecutor() {
    if (this.hotkeyExecutor) {
      return this.hotkeyExecutor;
    }

    const pptrBrowser = (await this.getActivePage()).browser();
    // @ts-ignore
    const envInfo = await getEnvInfo(pptrBrowser);

    this.hotkeyExecutor = new Hotkey({
      osName: envInfo.osName,
      browserName: envInfo.browserName,
    });

    return this.hotkeyExecutor;
  }

  private async getMeta(): Promise<{ url: string }> {
    try {
      const page = await this.getActivePage();
      return {
        url: page.url(),
      };
    } catch (error) {
      this.logger.error('Failed to get page meta:', error);
    }
    return {
      url: '',
    };
  }

  private async calculateRealCoords(
    coords: Coordinates,
  ): Promise<{ realX: number; realY: number }> {
    if (!coords.normalized) {
      if (!coords.raw) {
        throw new Error('Invalide coordinates');
      }
      return {
        realX: coords.raw.x,
        realY: coords.raw.y,
      };
    }
    const screenContext = await this.getScreenContext();
    return {
      // realX: (coords.normalized.x * screenContext.screenWidth) / screenContext.scaleX,
      // realY: (coords.normalized.y * screenContext.screenHeight) / screenContext.scaleY,
      realX: coords.normalized.x * screenContext.screenWidth,
      realY: coords.normalized.y * screenContext.screenHeight,
    };
  }
}
