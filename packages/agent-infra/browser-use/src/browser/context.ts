/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/browser/context.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import {
  type BrowserContextConfig,
  type BrowserState,
  DEFAULT_BROWSER_CONTEXT_CONFIG,
} from './types';
import Page, { build_initial_state } from './page';
import { createLogger } from '../utils';

const logger = createLogger('BrowserContext');
export default class BrowserContext {
  private readonly _config: BrowserContextConfig;
  private _currentTabId: string | null = null;
  private _attachedPages: Map<string, Page> = new Map();

  constructor(config: Partial<BrowserContextConfig>) {
    this._config = { ...DEFAULT_BROWSER_CONTEXT_CONFIG, ...config };
  }

  public getConfig(): BrowserContextConfig {
    return this._config;
  }

  public updateCurrentTabId(url: string): void {
    // only update tab id, but don't attach it.
    this._currentTabId = url;
  }

  private async _getOrCreatePage(
    url: string,
    forceUpdate = false,
  ): Promise<Page> {
    const existingPage = this._attachedPages.get(url);
    if (existingPage) {
      logger.info('getOrCreatePage', url, 'already attached');
      if (!forceUpdate) {
        return existingPage;
      }
      // detach the page and remove it from the attached pages if forceUpdate is true
      await existingPage.detachPuppeteer();
      this._attachedPages.delete(url);
    }
    logger.info('getOrCreatePage', url, 'creating new page');
    return new Page(url || '', '', this._config);
  }

  public async cleanup(): Promise<void> {
    const currentPage = await this.getCurrentPage();
    currentPage?.removeHighlight();
    // detach all pages
    for (const page of this._attachedPages.values()) {
      await page.detachPuppeteer();
    }
    this._attachedPages.clear();
    this._currentTabId = null;
  }

  public async attachPage(page: Page): Promise<boolean> {
    // check if page is already attached
    if (this._attachedPages.has(page.url())) {
      logger.info('attachPage_has', page.url(), 'already attached');
      return true;
    }

    if (await page.attachPuppeteer()) {
      logger.info('attachPage', page.url(), 'attached');
      // add page to managed pages
      this._attachedPages.set(page.url(), page);
      return true;
    }
    return false;
  }

  public async detachPage(url: string): Promise<void> {
    // detach page
    const page = this._attachedPages.get(url);
    if (page) {
      await page.detachPuppeteer();
      // remove page from managed pages
      this._attachedPages.delete(url);
    }
  }

  public async getCurrentPage(): Promise<Page> {
    // 1. If _currentTabId not set, query the active tab and attach it
    if (!this._currentTabId) {
      const page = await this._getOrCreatePage('');
      await this.attachPage(page);
      this._currentTabId = page.url();
      return page;
    }

    // 2. If _currentTabId is set but not in attachedPages, attach the tab
    const existingPage = this._attachedPages.get(this._currentTabId);
    if (!existingPage) {
      const page = await this._getOrCreatePage(this._currentTabId);
      // set current tab id to null if the page is not attached successfully
      await this.attachPage(page);
      return page;
    }

    // 3. Return existing page from attachedPages
    return existingPage;
  }

  /**
   * Get all tab IDs from the browser and the current window.
   * @returns A set of tab IDs.
   */
  public async getAllTabIds(): Promise<Set<string>> {
    const currentPage = await this.getCurrentPage();

    if (!currentPage || !currentPage.attached) {
      logger.warning('No attached page found');
      return new Set<string>();
    }

    const pages = await currentPage.browser?.pages();
    const tabs =
      pages?.map((page) => ({
        url: page.url(),
      })) || [];
    return new Set(
      tabs.map((tab) => tab.url).filter((url) => url !== undefined),
    );
  }

  private async waitForPageEvents(
    url: string,
    options: {
      waitForNavigation?: boolean;
      waitForLoad?: boolean;
      timeoutMs?: number;
    } = {},
  ): Promise<void> {
    const {
      waitForNavigation = true,
      waitForLoad = true,
      timeoutMs = 5000,
    } = options;

    const page = this._attachedPages.get(url);
    if (!page || !page.attached || !page.puppeteerPage) {
      logger.warning(`waitForPageEvents failed, page ${url} is not attached`);
      return;
    }

    const puppeteerPage = page.puppeteerPage;
    const promises: Promise<unknown>[] = [];

    if (waitForNavigation) {
      // wait for navigation to complete
      const navPromise = puppeteerPage
        .waitForNavigation({
          timeout: timeoutMs,
          waitUntil: 'domcontentloaded',
        })
        .catch((err) => {
          logger.debug(
            `waitForPageEvents failed, navigation error: ${err.message}`,
          );
        });
      promises.push(navPromise);
    }

    if (waitForLoad) {
      // wait for page to load
      const loadPromise = puppeteerPage
        .waitForNavigation({
          timeout: timeoutMs,
          waitUntil: 'load',
        })
        .catch((err) => {
          logger.debug(`waitForPageEvents failed, load error: ${err.message}`);
        });
      promises.push(loadPromise);

      const networkPromise = puppeteerPage
        .waitForNavigation({
          timeout: timeoutMs,
          waitUntil: 'networkidle0',
        })
        .catch((err) => {
          logger.debug(
            `waitForPageEvents failed, network idle error: ${err.message}`,
          );
        });
      promises.push(networkPromise);
    }

    // set timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`page operation timeout, waited ${timeoutMs} ms`)),
        timeoutMs,
      ),
    );

    // wait for any navigation to complete or timeout
    await Promise.race([Promise.all(promises), timeoutPromise]).catch(
      (error) => {
        // if timeout error, throw
        if (error.message.includes('page operation timeout')) {
          throw error;
        }
        // other errors may be because navigation is complete, we can continue
        logger.debug(`navigation error: ${error.message}`);
      },
    );

    // 确认页面内容已加载
    try {
      // 等待页面中的 body 元素出现，确保 DOM 已加载
      await puppeteerPage.waitForSelector('body', { timeout: timeoutMs / 2 });
    } catch (error) {
      logger.warning(`waitForPageEvents failed, body not found: ${error}`);
    }
  }

  public async switchTab(url: string): Promise<Page> {
    logger.info('switchTab', url);

    const page = await this._getOrCreatePage(url);
    await this.attachPage(page);
    this._currentTabId = url;
    return page;
  }

  public async navigateTo(url: string): Promise<void> {
    const page = await this.getCurrentPage();
    if (!page) {
      await this.openTab(url);
      return;
    }
    // if page is attached, use puppeteer to navigate to the url
    if (page.attached) {
      await page.navigateTo(url);
      return;
    }

    // Reattach the page after navigation completes
    const updatedPage = await this._getOrCreatePage(url, true);
    await this.attachPage(updatedPage);
    this._currentTabId = url;
  }

  public async openTab(url: string): Promise<Page> {
    // Create and attach the page after tab is fully loaded and activated
    const page = await this._getOrCreatePage(url);
    await this.attachPage(page);
    this._currentTabId = url;

    return page;
  }

  public async closeTab(url: string): Promise<void> {
    await this.detachPage(url);
    // update current tab id if needed
    if (this._currentTabId === url) {
      this._currentTabId = null;
    }
  }

  /**
   * Remove a tab from the attached pages map. This will not run detachPuppeteer.
   * @param tabId - The ID of the tab to remove.
   */
  public removeAttachedPage(url: string): void {
    this._attachedPages.delete(url);
    // update current tab id if needed
    if (this._currentTabId === url) {
      this._currentTabId = null;
    }
  }

  public async getState(): Promise<BrowserState> {
    const currentPage = await this.getCurrentPage();

    const pageState = !currentPage
      ? build_initial_state()
      : await currentPage.getState();

    const pages = await currentPage.browser?.pages();
    const pageInfos = await Promise.all(
      pages?.map(async (page) => ({
        id: page.url(),
        url: page.url(),
        title: await page.title(),
      })) || [],
    );

    const browserState: BrowserState = {
      ...pageState,
      pages: pageInfos,
    };
    return browserState;
  }

  public async removeHighlight(): Promise<void> {
    const page = await this.getCurrentPage();
    if (page) {
      await page.removeHighlight();
    }
  }
}
