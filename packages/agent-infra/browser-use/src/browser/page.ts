/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/browser/page.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import {
  type HTTPRequest,
  type HTTPResponse,
  type KeyInput,
} from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import { LocalBrowser } from '@agent-infra/browser';
import {
  Browser,
  Page as PuppeteerPage,
  ElementHandle,
  Frame,
} from 'puppeteer-core';
import {
  getClickableElements as _getClickableElements,
  removeHighlights as _removeHighlights,
  getScrollInfo as _getScrollInfo,
  getMarkdownContent as _getMarkdownContent,
  getReadabilityContent as _getReadabilityContent,
  ReadabilityResult,
} from '../dom/service';
import { DOMElementNode, type DOMState } from '../dom/views';
import {
  type BrowserContextConfig,
  DEFAULT_BROWSER_CONTEXT_CONFIG,
  type PageState,
} from './types';
import { createLogger, getBuildDomTreeScript } from '../utils';
import {
  locateElement,
  scrollIntoViewIfNeeded,
  waitForPageAndFramesLoad,
} from './utils';

const logger = createLogger('Page');

declare global {
  interface Window {
    turn2Markdown: (selector?: string) => string;
  }
}

export function build_initial_state(url?: string, title?: string): PageState {
  return {
    elementTree: new DOMElementNode({
      tagName: 'root',
      isVisible: true,
      parent: null,
      xpath: '',
      cssSelector: '',
      attributes: {},
      children: [],
    }),
    selectorMap: new Map(),
    tabId: 0,
    url: url || '',
    title: title || '',
    screenshot: null,
    pixelsAbove: 0,
    pixelsBelow: 0,
  };
}

export default class Page {
  private _browser: Browser | null = null;
  private _puppeteerPage: PuppeteerPage | null = null;
  private _config: BrowserContextConfig;
  private _state: PageState;
  private _validWebPage = false;

  constructor(
    url: string,
    title: string,
    config: Partial<BrowserContextConfig> = {},
  ) {
    this._config = { ...DEFAULT_BROWSER_CONTEXT_CONFIG, ...config };
    this._state = build_initial_state(url, title);
    // chrome://newtab/, chrome://newtab/extensions are not valid web pages, can't be attached
    this._validWebPage = (url && url.startsWith('http')) || false;
  }

  get browser(): Browser | null {
    return this._browser;
  }

  get puppeteerPage(): PuppeteerPage | null {
    return this._puppeteerPage;
  }

  get validWebPage(): boolean {
    return this._validWebPage;
  }

  get attached(): boolean {
    return this._validWebPage && this._puppeteerPage !== null;
  }

  async executeScript(
    page: PuppeteerPage,
    options: {
      contents?: string[];
    },
  ): Promise<any> {
    if (!page) {
      throw new Error('Puppeteer页面未连接');
    }

    if (options.contents && options.contents.length > 0) {
      for (const content of options.contents) {
        await page.evaluateOnNewDocument(content);
        logger.info(`已注入脚本文件`);
      }
    }
  }

  async attachPuppeteer(): Promise<boolean> {
    if (!this._validWebPage) {
      return false;
    }

    if (this._puppeteerPage) {
      return true;
    }

    logger.info('attaching puppeteer');
    // const browser = await connect({
    //   transport: await ExtensionTransport.connectTab(this._tabId),
    //   defaultViewport: null,
    //   protocol: 'cdp' as ProtocolType,
    // });
    const localBrowser = new LocalBrowser();
    await localBrowser.launch();

    const browser = await localBrowser.getBrowser();

    this._browser = browser;

    const [page] = await browser.pages();

    await this.executeScript(page, {
      contents: [getBuildDomTreeScript()],
    });

    await page.goto(this._state.url);
    this._puppeteerPage = page;

    // Add anti-detection scripts
    await this._addAntiDetectionScripts();

    return true;
  }

  private async _addAntiDetectionScripts(): Promise<void> {
    if (!this._puppeteerPage) {
      return;
    }

    await this._puppeteerPage.evaluateOnNewDocument(`
      // Webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Languages
      // Object.defineProperty(navigator, 'languages', {
      //   get: () => ['en-US', 'zh-CN']
      // });

      // Plugins
      // Object.defineProperty(navigator, 'plugins', {
      //   get: () => [1, 2, 3, 4, 5]
      // });

      // Chrome runtime
      window.chrome = { runtime: {} };

      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Shadow DOM
      (function () {
        const originalAttachShadow = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function attachShadow(options) {
          return originalAttachShadow.call(this, { ...options, mode: "open" });
        };
      })();
    `);
  }

  async detachPuppeteer(): Promise<void> {
    if (this._browser) {
      await this._browser.disconnect();
      this._browser = null;
      this._puppeteerPage = null;
      // reset the state
      this._state = build_initial_state();
    }
  }

  async removeHighlight(): Promise<void> {
    if (this._config.highlightElements && this._validWebPage) {
      await _removeHighlights(this._puppeteerPage!);
    }
  }

  async getClickableElements(focusElement: number): Promise<DOMState | null> {
    if (!this._validWebPage) {
      return null;
    }
    return _getClickableElements(
      this._puppeteerPage!,
      this._config.highlightElements,
      focusElement,
      this._config.viewportExpansion,
    );
  }

  // Get scroll position information for the current page.
  async getScrollInfo(): Promise<[number, number]> {
    if (!this._validWebPage) {
      return [0, 0];
    }
    return _getScrollInfo(this._puppeteerPage!);
  }

  async getContent(): Promise<string> {
    if (!this._puppeteerPage) {
      throw new Error('Puppeteer page is not connected');
    }
    return await this._puppeteerPage.content();
  }

  async getMarkdownContent(selector?: string): Promise<string> {
    if (!this._validWebPage) {
      return '';
    }
    return _getMarkdownContent(this._puppeteerPage!, selector);
  }

  async getReadabilityContent(): Promise<ReadabilityResult | null> {
    if (!this._validWebPage) {
      return null;
    }
    return _getReadabilityContent(this._puppeteerPage!);
  }

  async getState(): Promise<PageState> {
    if (!this._validWebPage) {
      // return the initial state
      return build_initial_state();
    }
    await this.waitForPageAndFramesLoad();
    const state = await this._updateState();
    return state;
  }

  async _updateState(useVision = true, focusElement = -1): Promise<PageState> {
    try {
      // Test if page is still accessible
      // @ts-expect-error - puppeteerPage is not null, already checked before calling this function
      await this._puppeteerPage.evaluate('1');
    } catch (error) {
      logger.warning('Current page is no longer accessible:', error);
      if (this._browser) {
        const pages = await this._browser.pages();
        if (pages.length > 0) {
          this._puppeteerPage = pages[0];
        } else {
          throw new Error('Browser closed: no valid pages available');
        }
      }
    }

    try {
      await this.removeHighlight();

      // Get DOM content (equivalent to dom_service.get_clickable_elements)
      // This part would need to be implemented based on your DomService logic
      const content = await this.getClickableElements(focusElement);
      if (!content) {
        logger.warning('Failed to get clickable elements');
        // Return last known good state if available
        return this._state;
      }
      // log the attributes of content object
      if ('selectorMap' in content) {
        logger.debug('content.selectorMap:', content.selectorMap.size);
      } else {
        logger.debug('content.selectorMap: not found');
      }
      if ('elementTree' in content) {
        logger.debug('content.elementTree:', content.elementTree?.tagName);
      } else {
        logger.debug('content.elementTree: not found');
      }

      // Take screenshot if needed
      const screenshot = useVision ? await this.takeScreenshot() : null;
      const [pixelsAbove, pixelsBelow] = await this.getScrollInfo();

      // update the state
      this._state.elementTree = content.elementTree;
      this._state.selectorMap = content.selectorMap;
      this._state.url = this._puppeteerPage?.url() || '';
      this._state.title = (await this._puppeteerPage?.title()) || '';
      this._state.screenshot = screenshot;
      this._state.pixelsAbove = pixelsAbove;
      this._state.pixelsBelow = pixelsBelow;
      return this._state;
    } catch (error) {
      logger.error('Failed to update state:', error);
      // Return last known good state if available
      return this._state;
    }
  }

  async takeScreenshot(fullPage = false): Promise<string | null> {
    if (!this._puppeteerPage) {
      throw new Error('Puppeteer page is not connected');
    }

    try {
      // First disable animations/transitions
      await this._puppeteerPage.evaluate(() => {
        const styleId = 'puppeteer-disable-animations';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            *, *::before, *::after {
              animation: none !important;
              transition: none !important;
            }
          `;
          document.head.appendChild(style);
        }
      });

      // Take the screenshot using JPEG format with 80% quality
      const screenshot = await this._puppeteerPage.screenshot({
        fullPage: fullPage,
        encoding: 'base64',
        type: 'jpeg',
        quality: 80, // Good balance between quality and file size
      });

      // Clean up the style element
      await this._puppeteerPage.evaluate(() => {
        const style = document.getElementById('puppeteer-disable-animations');
        if (style) {
          style.remove();
        }
      });

      return screenshot as string;
    } catch (error) {
      logger.error('Failed to take screenshot:', error);
      throw error;
    }
  }

  url(): string {
    if (this._puppeteerPage) {
      return this._puppeteerPage.url();
    }
    return this._state.url;
  }

  async title(): Promise<string> {
    if (this._puppeteerPage) {
      return await this._puppeteerPage.title();
    }
    return this._state.title;
  }

  async navigateTo(url: string): Promise<void> {
    if (!this._puppeteerPage) {
      return;
    }
    logger.info('navigateTo', url);

    try {
      await Promise.all([
        this.waitForPageAndFramesLoad(),
        this._puppeteerPage.goto(url),
      ]);
      logger.info('navigateTo complete');
    } catch (error) {
      // Check if it's a timeout error
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warning(
          'Navigation timeout, but page might still be usable:',
          error,
        );
        // You might want to check if the page is actually loaded despite the timeout
      } else {
        logger.error('NavigationTo failed:', error);
        throw error; // Re-throw non-timeout errors
      }
    }
  }

  async refreshPage(): Promise<void> {
    if (!this._puppeteerPage) return;

    try {
      await Promise.all([
        this.waitForPageAndFramesLoad(),
        this._puppeteerPage.reload(),
      ]);
      logger.info('Page refresh complete');
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warning(
          'Refresh timeout, but page might still be usable:',
          error,
        );
      } else {
        logger.error('Page refresh failed:', error);
        throw error;
      }
    }
  }

  async goBack(): Promise<void> {
    if (!this._puppeteerPage) return;

    try {
      await Promise.all([
        this.waitForPageAndFramesLoad(),
        this._puppeteerPage.goBack(),
      ]);
      logger.info('Navigation back completed');
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warning(
          'Back navigation timeout, but page might still be usable:',
          error,
        );
      } else {
        logger.error('Could not navigate back:', error);
        throw error;
      }
    }
  }

  async goForward(): Promise<void> {
    if (!this._puppeteerPage) return;

    try {
      await Promise.all([
        this.waitForPageAndFramesLoad(),
        this._puppeteerPage.goForward(),
      ]);
      logger.info('Navigation forward completed');
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warning(
          'Forward navigation timeout, but page might still be usable:',
          error,
        );
      } else {
        logger.error('Could not navigate forward:', error);
        throw error;
      }
    }
  }

  async scrollDown(amount?: number): Promise<void> {
    if (this._puppeteerPage) {
      if (amount) {
        await this._puppeteerPage?.evaluate(`window.scrollBy(0, ${amount});`);
      } else {
        await this._puppeteerPage?.evaluate(
          'window.scrollBy(0, window.innerHeight);',
        );
      }
    }
  }

  async scrollUp(amount?: number): Promise<void> {
    if (this._puppeteerPage) {
      if (amount) {
        await this._puppeteerPage?.evaluate(`window.scrollBy(0, -${amount});`);
      } else {
        await this._puppeteerPage?.evaluate(
          'window.scrollBy(0, -window.innerHeight);',
        );
      }
    }
  }

  async sendKeys(keys: string): Promise<void> {
    if (!this._puppeteerPage) {
      throw new Error('Puppeteer page is not connected');
    }

    // Split combination keys (e.g., "Control+A" or "Shift+ArrowLeft")
    const keyParts = keys.split('+');
    const modifiers = keyParts.slice(0, -1);
    const mainKey = keyParts[keyParts.length - 1];

    // Press modifiers and main key, ensure modifiers are released even if an error occurs.
    try {
      // Press all modifier keys (e.g., Control, Shift, etc.)
      for (const modifier of modifiers) {
        await this._puppeteerPage.keyboard.down(this._convertKey(modifier));
      }
      // Press the main key
      // also wait for stable state
      await Promise.all([
        this._puppeteerPage.keyboard.press(this._convertKey(mainKey)),
        this.waitForPageAndFramesLoad(),
      ]);
      logger.info('sendKeys complete', keys);
    } catch (error) {
      logger.error('Failed to send keys:', error);
      throw new Error(
        `Failed to send keys: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      // Release all modifier keys in reverse order regardless of any errors in key press.
      for (const modifier of [...modifiers].reverse()) {
        try {
          await this._puppeteerPage.keyboard.up(this._convertKey(modifier));
        } catch (releaseError) {
          logger.error('Failed to release modifier:', modifier, releaseError);
        }
      }
    }
  }

  private _convertKey(key: string): KeyInput {
    const lowerKey = key.trim().toLowerCase();
    const keyMap: { [key: string]: string } = {
      // Letters
      a: 'KeyA',
      b: 'KeyB',
      c: 'KeyC',
      d: 'KeyD',
      e: 'KeyE',
      f: 'KeyF',
      g: 'KeyG',
      h: 'KeyH',
      i: 'KeyI',
      j: 'KeyJ',
      k: 'KeyK',
      l: 'KeyL',
      m: 'KeyM',
      n: 'KeyN',
      o: 'KeyO',
      p: 'KeyP',
      q: 'KeyQ',
      r: 'KeyR',
      s: 'KeyS',
      t: 'KeyT',
      u: 'KeyU',
      v: 'KeyV',
      w: 'KeyW',
      x: 'KeyX',
      y: 'KeyY',
      z: 'KeyZ',

      // Numbers
      '0': 'Digit0',
      '1': 'Digit1',
      '2': 'Digit2',
      '3': 'Digit3',
      '4': 'Digit4',
      '5': 'Digit5',
      '6': 'Digit6',
      '7': 'Digit7',
      '8': 'Digit8',
      '9': 'Digit9',

      // Special keys
      control: 'Control',
      shift: 'Shift',
      alt: 'Alt',
      meta: 'Meta',
      enter: 'Enter',
      backspace: 'Backspace',
      delete: 'Delete',
      arrowleft: 'ArrowLeft',
      arrowright: 'ArrowRight',
      arrowup: 'ArrowUp',
      arrowdown: 'ArrowDown',
      escape: 'Escape',
      tab: 'Tab',
      space: 'Space',
    };

    const convertedKey = keyMap[lowerKey] || key;
    logger.info('convertedKey', convertedKey);
    return convertedKey as KeyInput;
  }

  async scrollToText(text: string): Promise<boolean> {
    if (!this._puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }

    try {
      // Try different locator strategies
      const selectors = [
        // Using text selector (equivalent to get_by_text)
        `::-p-text(${text})`,
        // Using XPath selector (contains text) - case insensitive
        `::-p-xpath(//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')])`,
      ];

      for (const selector of selectors) {
        try {
          const element = await this._puppeteerPage.$(selector);
          if (element) {
            // Check if element is visible
            const isVisible = await element.evaluate((el) => {
              const style = window.getComputedStyle(el);
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0'
              );
            });

            if (isVisible) {
              await this._scrollIntoViewIfNeeded(element);
              await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for scroll to complete
              return true;
            }
          }
        } catch (e) {
          logger.debug(`Locator attempt failed: ${e}`);
        }
      }
      return false;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  async getDropdownOptions(
    index: number,
  ): Promise<Array<{ index: number; text: string; value: string }>> {
    const selectorMap = this.getSelectorMap();
    const element = selectorMap?.get(index);

    if (!element || !this._puppeteerPage) {
      throw new Error('Element not found or puppeteer is not connected');
    }

    try {
      // Get the element handle using the element's selector
      const elementHandle = await this.locateElement(element);
      if (!elementHandle) {
        throw new Error('Dropdown element not found');
      }

      // Evaluate the select element to get all options
      const options = await elementHandle.evaluate((select) => {
        if (!(select instanceof HTMLSelectElement)) {
          throw new Error('Element is not a select element');
        }

        return Array.from(select.options).map((option) => ({
          index: option.index,
          text: option.text, // Not trimming to maintain exact match for selection
          value: option.value,
        }));
      });

      if (!options.length) {
        throw new Error('No options found in dropdown');
      }

      return options;
    } catch (error) {
      throw new Error(
        `Failed to get dropdown options: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async selectDropdownOption(index: number, text: string): Promise<string> {
    const selectorMap = this.getSelectorMap();
    const element = selectorMap?.get(index);

    if (!element || !this._puppeteerPage) {
      throw new Error('Element not found or puppeteer is not connected');
    }

    logger.debug(`Attempting to select '${text}' from dropdown`);
    logger.debug(`Element attributes: ${JSON.stringify(element.attributes)}`);
    logger.debug(`Element tag: ${element.tagName}`);

    // Validate that we're working with a select element
    if (element.tagName?.toLowerCase() !== 'select') {
      const msg = `Cannot select option: Element with index ${index} is a ${element.tagName}, not a SELECT`;
      logger.error(msg);
      throw new Error(msg);
    }

    try {
      // Get the element handle using the element's selector
      const elementHandle = await this.locateElement(element);
      if (!elementHandle) {
        throw new Error(`Dropdown element with index ${index} not found`);
      }

      // Verify dropdown and select option in one call
      const result = await elementHandle.evaluate(
        (select, optionText, elementIndex) => {
          if (!(select instanceof HTMLSelectElement)) {
            return {
              found: false,
              message: `Element with index ${elementIndex} is not a SELECT`,
            };
          }

          const options = Array.from(select.options);
          const option = options.find((opt) => opt.text.trim() === optionText);

          if (!option) {
            const availableOptions = options
              .map((o) => o.text.trim())
              .join('", "');
            return {
              found: false,
              message: `Option "${optionText}" not found in dropdown element with index ${elementIndex}. Available options: "${availableOptions}"`,
            };
          }

          // Set the value and dispatch events
          const previousValue = select.value;
          select.value = option.value;

          // Only dispatch events if the value actually changed
          if (previousValue !== option.value) {
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
          }

          return {
            found: true,
            message: `Selected option "${optionText}" with value "${option.value}"`,
          };
        },
        text,
        index,
      );

      logger.debug('Selection result:', result);
      // whether found or not, return the message
      return result.message;
    } catch (error) {
      const errorMessage = `${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async locateElement(element: DOMElementNode): Promise<ElementHandle | null> {
    return await locateElement(this._puppeteerPage!, element, this._config);
  }

  async inputTextElementNode(
    useVision: boolean,
    elementNode: DOMElementNode,
    text: string,
  ): Promise<void> {
    if (!this._puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }

    try {
      // Highlight before typing
      if (elementNode.highlightIndex !== undefined) {
        await this._updateState(useVision, elementNode.highlightIndex);
      }

      const element = await this.locateElement(elementNode);
      if (!element) {
        throw new Error(`Element: ${elementNode} not found`);
      }

      // Scroll element into view if needed
      await this._scrollIntoViewIfNeeded(element);

      // Clear the input field (equivalent to fill(''))
      await element.evaluate((el) => {
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement
        ) {
          el.value = '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Type the text
      await element.type(text);
      // Wait for stable state ?
    } catch (error) {
      throw new Error(
        `Failed to input text into element: ${elementNode}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async _scrollIntoViewIfNeeded(
    element: ElementHandle,
    timeout = 2500,
  ): Promise<void> {
    await scrollIntoViewIfNeeded(element, timeout);
  }

  async clickElementNode(
    useVision: boolean,
    elementNode: DOMElementNode,
  ): Promise<void> {
    if (!this._puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }

    try {
      // Highlight before clicking
      if (elementNode.highlightIndex !== undefined) {
        await this._updateState(useVision, elementNode.highlightIndex);
      }

      const element = await this.locateElement(elementNode);
      if (!element) {
        throw new Error(`Element: ${elementNode} not found`);
      }

      // Scroll element into view if needed
      await this._scrollIntoViewIfNeeded(element);

      try {
        // First attempt: Use Puppeteer's click method with timeout
        await Promise.race([
          element.click(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Click timeout')), 2000),
          ),
        ]);
      } catch (error) {
        // Second attempt: Use evaluate to perform a direct click
        logger.info('Failed to click element, trying again', error);
        try {
          await element.evaluate((el) => (el as HTMLElement).click());
        } catch (secondError) {
          throw new Error(
            `Failed to click element: ${secondError instanceof Error ? secondError.message : String(secondError)}`,
          );
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to click element: ${elementNode}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getSelectorMap(): Map<number, DOMElementNode> {
    return this._state.selectorMap;
  }

  async getElementByIndex(index: number): Promise<ElementHandle | null> {
    const selectorMap = this.getSelectorMap();
    const element = selectorMap.get(index);
    if (!element) return null;
    return await this.locateElement(element);
  }

  getDomElementByIndex(index: number): DOMElementNode | null {
    const selectorMap = this.getSelectorMap();
    return selectorMap.get(index) || null;
  }

  isFileUploader(
    elementNode: DOMElementNode,
    maxDepth = 3,
    currentDepth = 0,
  ): boolean {
    if (currentDepth > maxDepth) {
      return false;
    }

    // Check current element
    if (elementNode.tagName === 'input') {
      // Check for file input attributes
      const attributes = elementNode.attributes;
      // biome-ignore lint/complexity/useLiteralKeys: <explanation>
      if (
        attributes['type']?.toLowerCase() === 'file' ||
        !!attributes['accept']
      ) {
        return true;
      }
    }

    // Recursively check children
    if (elementNode.children && currentDepth < maxDepth) {
      for (const child of elementNode.children) {
        if ('tagName' in child) {
          // DOMElementNode type guard
          if (
            this.isFileUploader(
              child as DOMElementNode,
              maxDepth,
              currentDepth + 1,
            )
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  async waitForPageAndFramesLoad(timeoutOverwrite?: number): Promise<void> {
    await waitForPageAndFramesLoad(
      this._puppeteerPage,
      timeoutOverwrite,
      this._config,
    );
  }
}
