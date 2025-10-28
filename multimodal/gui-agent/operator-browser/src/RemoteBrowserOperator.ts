/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { BrowserOperator } from './browser-operator';
import { RemoteBrowserOperatorOptions, SearchEngine, searchEngineUrlMap } from './types';
import { BrowserType, RemoteBrowser } from '@agent-infra/browser';

export class RemoteBrowserOperator extends BrowserOperator {
  private wsEndpoint: string;
  private viewport?: { width: number; height: number };
  private searchEngine?: SearchEngine;

  constructor(options: RemoteBrowserOperatorOptions) {
    const {
      wsEndpoint,
      viewport,
      highlightClickableElements = false,
      showActionInfo = false,
      showWaterFlow = false,
      searchEngine,
    } = options || {};

    // Create logger with LocalBrowserOperator prefix
    const logger = (options?.logger || new ConsoleLogger(undefined, LogLevel.DEBUG)).spawn(
      '[Remote]',
    );
    logger.debug('ctor: wsEndpoint: ', wsEndpoint);

    const browser = new RemoteBrowser({
      wsEndpoint: wsEndpoint,
      logger: logger.spawn('[Browser]'),
    });

    const browserOptions = {
      browser: browser,
      browserType: 'chrome' as BrowserType,
      logger: logger,
      highlightClickableElements: highlightClickableElements,
      showActionInfo: showActionInfo,
      showWaterFlow: showWaterFlow,
    };

    super(browserOptions);
    logger.debug('super ctor done');

    this.wsEndpoint = wsEndpoint;
    this.viewport = viewport;
    this.searchEngine = searchEngine;
  }

  protected async initialize(): Promise<void> {
    this.logger.debug('initialize: start');
    await this.browser.launch({
      timeout: 1000,
      defaultViewport: this.viewport,
    });
    this.logger.debug('initialize: browser launched');

    const openingPage = await this.browser?.getActivePage();
    const targetUrl = this.searchEngine ? searchEngineUrlMap[this.searchEngine] : undefined;
    if (targetUrl) {
      await openingPage?.goto(targetUrl, {
        waitUntil: 'networkidle2',
      });
    }
    this.logger.debug('initialize: search engine opened');

    await super.initialize();
  }
}
