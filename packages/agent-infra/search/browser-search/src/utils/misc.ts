/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Page } from '@agent-infra/browser';
import { SearchResult } from '../types';

/**
 * Applies various stealth techniques to make the browser appear more like a regular user browser
 * @param page - Puppeteer page object
 */
export async function applyStealthScripts(page: Page) {
  await page.setBypassCSP(true);
  await page.setUserAgent(
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/237.84.2.178 Safari/537.36`,
  );

  /**
   * https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html
   */
  await page.evaluate(() => {
    /**
     * Override the navigator.webdriver property
     * The webdriver read-only property of the navigator interface indicates whether the user agent is controlled by automation.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/webdriver
     */
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Mock languages and plugins to mimic a real browser
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => [{}, {}, {}, {}, {}],
    });

    // Redefine the headless property
    Object.defineProperty(navigator, 'headless', {
      get: () => false,
    });

    // Override the permissions API
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({
            state: Notification.permission,
          } as PermissionStatus)
        : originalQuery(parameters);
  });
}

/**
 * Extracts search result links from a Google search page
 * @param window - Browser window object
 * @returns Array of search results with title and URL
 */
export function getSearchPageLinks(window: Window): SearchResult[] {
  const links: SearchResult[] = [];
  const document = window.document;

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };

  try {
    const elements = document.querySelectorAll('.g');
    elements.forEach((element) => {
      const titleEl = element.querySelector('h3');
      const urlEl = element.querySelector('a');
      const url = urlEl?.getAttribute('href');

      if (!url || !isValidUrl(url)) return;

      const item: SearchResult = {
        title: titleEl?.textContent || '',
        url,
        snippet: '',
        content: '',
      };

      if (!item.title || !item.url) return;

      links.push(item);
    });
  } catch (error) {
    console.error(error);
  }

  return links;
}

/**
 * Sets up request interception to block unnecessary resources and apply stealth techniques
 * @param page - Puppeteer page object
 */
export async function interceptRequest(page: Page) {
  await applyStealthScripts(page);
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    const resourceType = request.resourceType();

    if (resourceType !== 'document') {
      return request.abort();
    }

    if (request.isNavigationRequest()) {
      return request.continue();
    }

    return request.abort();
  });
}
