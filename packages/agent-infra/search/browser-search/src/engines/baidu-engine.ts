/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Page } from '@agent-infra/browser';
import type { SearchEngineAdapter, SearchResult } from '../types';

/**
 * Baidu search engine adapter implementation.
 * Provides functionality to generate Baidu search URLs and extract search results from Baidu search pages.
 */
export class BaiduSearchEngine implements SearchEngineAdapter {
  /**
   * Generates a Baidu search URL based on the provided query and options.
   *
   * @param query - The search query string
   * @param options - Search configuration options
   * @param options.count - Number of search results to request (default: 10)
   * @param options.excludeDomains - Array of domain names to exclude from search results
   * @returns Formatted Baidu search URL as a string
   */
  getSearchUrl(
    query: string,
    options: {
      count?: number;
      excludeDomains?: string[];
    },
  ): string {
    // Baidu doesn't support excluding domains in the same way as Google
    // But we can add '-site:domain' to the query
    const excludeDomainsQuery =
      options.excludeDomains && options.excludeDomains.length > 0
        ? options.excludeDomains.map((domain) => `-site:${domain}`).join(' ')
        : '';

    const searchParams = new URLSearchParams({
      wd: excludeDomainsQuery ? `${excludeDomainsQuery} ${query}` : query,
      rn: `${options.count || 10}`, // rn is the parameter for result count
    });

    return `https://www.baidu.com/s?${searchParams.toString()}`;
  }

  /**
   * Extracts search results from a Baidu search page.
   *
   * @param window - The browser window object containing the loaded Baidu search page
   * @returns Array of search results extracted from the page
   */
  extractSearchResults(window: Window): SearchResult[] {
    const links: SearchResult[] = [];
    const document = window.document;

    /**
     * Validates if a string is a properly formatted URL.
     *
     * @param url - The URL string to validate
     * @returns Boolean indicating if the URL is valid
     */
    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch (error) {
        return false;
      }
    };

    /**
     * Extracts the snippet text from an element by cloning it and removing title elements
     *
     * @param element - The search result element
     * @returns The extracted snippet text
     */
    const extractSnippet = (element: Element): string => {
      // Clone the element to avoid modifying the original DOM
      const clone = element.cloneNode(true) as Element;

      // Remove title elements (typically in .t elements for Baidu)
      const titleElements = clone.querySelectorAll('.t');
      titleElements.forEach((el) => el.remove());

      // Remove any other non-content elements
      const nonContentElements = clone.querySelectorAll('.c-tools, .c-gap-top');
      nonContentElements.forEach((el) => el.remove());

      // Remove script and style elements
      const scriptElements = clone.querySelectorAll('script, style');
      scriptElements.forEach((el) => el.remove());

      // Get text content and remove duplicates
      const text = Array.from(clone.querySelectorAll('*'))
        .filter((node) => node.textContent?.trim())

        .map((node) => node.textContent?.trim())
        .filter(Boolean)
        .reduce((acc: string[], curr) => {
          // Only add text if it's not already included in accumulated text
          if (
            !acc.some(
              (text) =>
                text.includes(curr as string) ||
                (curr as string).includes(text),
            )
          ) {
            acc.push(curr as string);
          }
          return acc;
        }, [])
        .join(' ')
        .trim()
        .replace(/\s+/g, ' ');

      return text;
    };

    try {
      // Baidu search results are in elements with class '.c-container'
      const elements = document.querySelectorAll('.c-container');
      elements.forEach((element) => {
        const titleEl = element.querySelector('a');
        const url = titleEl?.getAttribute('href');

        // Extract snippet using the generic method
        const snippet = extractSnippet(element);

        if (!url) return;

        const item: SearchResult = {
          title: titleEl?.textContent || '',
          url,
          content: '',
          snippet,
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
   * Waits for Baidu search results to load completely.
   *
   * @param page - The Puppeteer page object
   * @returns Promise that resolves when search results are loaded
   */
  async waitForSearchResults(page: Page): Promise<void> {
    await page.waitForSelector('#content_left');
  }
}
