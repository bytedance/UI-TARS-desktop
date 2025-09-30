/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { LocalBrowser, BrowserFinder, BrowserType } from '@agent-infra/browser';

import { LocalBrowserOperatorOptions, SearchEngine, searchEngineUrlMap } from './types';
import { BrowserOperator } from './browser-operator';

export class LocalBrowserOperator extends BrowserOperator {
  private browserPath: string;
  private browserType: BrowserType;
  private searchEngine?: SearchEngine;

  constructor(options?: LocalBrowserOperatorOptions) {
    const {
      highlightClickableElements = false,
      showActionInfo = false,
      showWaterFlow = false,
      searchEngine,
    } = options || {};

    // Create logger with LocalBrowserOperator prefix
    const logger = (options?.logger || new ConsoleLogger(undefined, LogLevel.DEBUG)).spawn(
      '[Local]',
    );

    const browserFinder = new BrowserFinder(logger.spawn('[BrowserFinder]'));
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

    const targetUrl = this.searchEngine ? searchEngineUrlMap[this.searchEngine] : undefined;
    if (targetUrl) {
      const openingPage = await this.browser?.getActivePage();
      await openingPage?.goto(targetUrl, {
        waitUntil: 'networkidle2',
      });
    }
    this.logger.debug('initialize: search engine opened');

    await super.initialize();
  }
}
