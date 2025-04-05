import type { Page } from '@agent-infra/browser';
import type { SearchEngineAdapter, SearchResult } from '../types';

export class SogouSearchEngine implements SearchEngineAdapter {
  /**
   * Generates a Sogou search URL based on the provided query and options.
   *
   * @param query - The search query string
   * @param options - Search configuration options
   * @param options.count - Number of search results to request (default: 10)
   * @param options.excludeDomains - Array of domain names to exclude from search results
   * @returns Formatted Sogou search URL as a string
   */
  getSearchUrl(
    query: string,
    options: {
      count?: number;
      excludeDomains?: string[];
    },
  ): string {
    const { count = 10, excludeDomains = [] } = options;

    const excludeDomainsQuery =
      excludeDomains && excludeDomains.length > 0
        ? excludeDomains.map((domain) => `-site:${domain}`).join(' ')
        : '';

    const searchParams = new URLSearchParams({
      query: `${excludeDomainsQuery ? `${excludeDomainsQuery} ` : ''}${query}`,
      num: `${count}`,
    });

    return `https://www.sogou.com/web?${searchParams.toString()}`;
  }

  /**
   * !NOTE: This function runs in the context of the browser page, not Node.js
   * 
   * Extract search results from Sogou search page.
   * @param window - window
   * @returns Search results extracted from the page
   */
  extractSearchResults(window: Window): SearchResult[] {
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

    const BaseUrl = 'https://www.sogou.com';
    
    const SELECTOR = {
      results: '.results .vrwrap',
      resultTitle: '.vr-title',
      resultLink: '.vr-title > a',
      resultSnippet: ['.star-wiki', '.fz-mid', '.attribute-centent'],
      resultSnippetExcluded: ['.text-lightgray', '.zan-box', '.tag-website'],
      related: '#main .vrwrap.middle-better-hintBox .hint-mid',
    };

    try {
      const elements = document.querySelectorAll(SELECTOR.results);
      elements.forEach((element) => {
        const titleEl = element.querySelector(SELECTOR.resultTitle);
        let url = element.querySelector(SELECTOR.resultLink)?.getAttribute('href');

        // Extract snippets
        const snippets = SELECTOR.resultSnippet.map((selector) => {
          const cloneElement = element.cloneNode(true) as HTMLElement;
          // remove excluded elements
          SELECTOR.resultSnippetExcluded.forEach((excludedSelector) => {
            const el = cloneElement.querySelector(excludedSelector);
            el?.remove();
          });
          // get the text content of the element
          const el = cloneElement.querySelector(selector);
          return el?.textContent?.trim() || '';
        });

        const snippet = snippets
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        // if the url is like '/xxxx', add the base url
        if (!url?.includes('http')) url = `${BaseUrl}${url}`;

        if (!url?.trim() || !isValidUrl(url)) return;

        const item: SearchResult = {
          title: titleEl?.textContent?.trim() || '',
          url,
          snippet,
          content: '',
        };

        if (!item.title || !item.url) return;

        links.push(item);
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error extracting search results from Sogou:', msg);
    }

    return links;
  }

  /**
  * Waits for Sogou search results to load completely.
  *
  * @param page - The Puppeteer page object
  * @returns Promise that resolves when search results are loaded
  */
  async waitForSearchResults(page: Page): Promise<void> {
    await page.waitForSelector('#pagebar_container');
  }
}
