/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Page } from '@agent-infra/browser';
import type { SearchEngineAdapter, SearchResult } from '../types';

/**
 * Google search engine adapter implementation.
 * Provides functionality to generate Google search URLs and extract search results from Google search pages.
 */
export class GoogleSearchEngine implements SearchEngineAdapter {
  /**
   * Generates a Google search URL based on the provided query and options.
   *
   * @param query - The search query string
   * @param options - Search configuration options
   * @param options.count - Number of search results to request (default: 10)
   * @param options.excludeDomains - Array of domain names to exclude from search results
   * @returns Formatted Google search URL as a string
   */
  getSearchUrl(
    query: string,
    options: {
      count?: number;
      excludeDomains?: string[];
    },
  ): string {
    const searchParams = new URLSearchParams({
      q: `${
        options.excludeDomains && options.excludeDomains.length > 0
          ? `${options.excludeDomains.map((domain) => `-site:${domain}`).join(' ')} `
          : ''
      }${query}`,
      num: `${options.count || 10}`,
    });

    searchParams.set('udm', '14');
    return `https://www.google.com/search?${searchParams.toString()}`;
  }

  /**
   * Extracts search results from a Google search page.
   *
   * @param window - The browser window object containing the loaded Google search page
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

    try {
      // Google search results are contained in elements with class 'g'
      const elements = document.querySelectorAll('.g');
      elements.forEach((element) => {
        const titleEl = element.querySelector('h3');
        const urlEl = element.querySelector('a');
        const url = urlEl?.getAttribute('href');

        if (!url || !isValidUrl(url)) return;

        const item: SearchResult = {
          title: titleEl?.textContent || '',
          url,
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
   * Waits for Google search results to load completely.
   *
   * @param page - The Puppeteer page object
   * @returns Promise that resolves when search results are loaded
   */
  async waitForSearchResults(page: Page): Promise<void> {
    await page.waitForSelector('#search');
  }
}
