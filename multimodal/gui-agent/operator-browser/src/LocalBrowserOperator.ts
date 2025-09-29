/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { LocalBrowser, BrowserFinder, BrowserType } from '@agent-infra/browser';

import { LocalBrowserOperatorOptions, SearchEngine } from './types';
import { RefactoredOperator } from './refactored-operator';

export class LocalBrowserOperator extends RefactoredOperator {
  private browserPath: string;
  private browserType: BrowserType;
  private searchEngine: SearchEngine;

  constructor(options?: LocalBrowserOperatorOptions) {
    const {
      highlightClickableElements = false,
      showActionInfo = false,
      showWaterFlow = false,
      searchEngine = 'google' as SearchEngine,
    } = options || {};

    // Create logger with LocalBrowserOperator prefix
    const logger = (options?.logger || new ConsoleLogger(undefined, LogLevel.DEBUG)).spawn(
      '[LocalBrowserOperator]',
    );

    const browserFinder = new BrowserFinder(logger.spawn('[Finder]'));
    const { path, type } = browserFinder.findBrowser();
    logger.debug('ctor: browserData: ', { path, type });

    const browser = new LocalBrowser({ logger: logger.spawn('[Browser]') });
    const browserOptions = {
      browser: browser,
      browserType: type,
      logger: logger,
      highlightClickableElements: highlightClickableElements,
      showActionInfo: showActionInfo,
      showWaterFlow: showWaterFlow,
    };
    super(browserOptions);
    logger.debug('super ctor done');

    this.browserPath = path;
    this.browserType = type;
    this.searchEngine = searchEngine;
  }

  protected async initialize(): Promise<void> {
    this.logger.debug('initialize: start');
    await this.browser.launch({
      executablePath: this.browserPath,
      browserType: this.browserType,
    });
    this.logger.debug('initialize: browser launched');

    const openingPage = await this.browser?.getActivePage();
    const searchEngineUrls = {
      [SearchEngine.GOOGLE]: 'https://www.google.com/',
      [SearchEngine.BING]: 'https://www.bing.com/',
      [SearchEngine.BAIDU]: 'https://www.baidu.com/',
    };
    const targetUrl = searchEngineUrls[this.searchEngine];
    await openingPage?.goto(targetUrl, {
      waitUntil: 'networkidle2',
    });
    this.logger.debug('initialize: search engine opened');

    await super.initialize();
  }

  public async destroyInstance(): Promise<void> {
    this.logger.debug('destroyInstance: start');
    await this.cleanup();
    if (this.browser) {
      await this.browser.close();
    }
  }
}
