/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Page } from 'puppeteer-core';
import { store } from './store.js';
import { ResourceContext, ToolContext } from './typings.js';
import { ensureBrowser } from './utils/browser.js';
import {
  getBuildDomTreeScript,
  parseNode,
  type RawDomTreeNode,
  DOMElementNode,
  createSelectorMap,
} from '@agent-infra/browser-use';

export class BrowserContext {
  async getResourceContext(): Promise<ResourceContext> {
    return {
      logger: store.logger,
    };
  }

  async getToolContext(): Promise<ToolContext | null> {
    const { logger, globalConfig } = store;

    const initialBrowser = await ensureBrowser();
    const { browser, currTabsIdx } = initialBrowser;
    let { page } = initialBrowser;

    page?.removeAllListeners('popup');
    page?.on('popup', async (popup) => {
      if (popup) {
        logger.info(`popup page: ${popup.url()}`);
        await popup.bringToFront();
        page = popup;
        store.globalPage = popup;
      }
    });

    return {
      page,
      currTabsIdx,
      browser,
      logger,
      contextOptions: globalConfig.contextOptions || {},
      buildDomTree: this.buildDomTree,
    };
  }

  async buildDomTree(page: Page) {
    const logger = store.logger;

    try {
      // check if the buildDomTree script is already injected
      const existBuildDomTreeScript = await page.evaluate(
        /* istanbul ignore next */ () => {
          return typeof window.buildDomTree === 'function';
        },
      );
      if (!existBuildDomTreeScript) {
        const injectScriptContent = getBuildDomTreeScript();
        await page.evaluate(
          /* istanbul ignore next */ (script) => {
            const scriptElement = document.createElement('script');
            scriptElement.textContent = script;
            document.head.appendChild(scriptElement);
          },
          injectScriptContent,
        );
      }

      const rawDomTree = await page.evaluate(
        /* istanbul ignore next */ () => {
          // Access buildDomTree from the window context of the target page
          return window.buildDomTree({
            doHighlightElements: true,
            focusHighlightIndex: -1,
            viewportExpansion: 0,
          });
        },
      );
      if (rawDomTree !== null) {
        const elementTree = parseNode(rawDomTree as RawDomTreeNode);
        if (elementTree !== null && elementTree instanceof DOMElementNode) {
          const clickableElements = elementTree.clickableElementsToString();
          store.selectorMap = createSelectorMap(elementTree);

          return {
            clickableElements,
            elementTree,
            selectorMap: store.selectorMap,
          };
        }
      }
      return null;
    } catch (error) {
      logger.error('Error building DOM tree:', error);
      return null;
    }
  }
}
