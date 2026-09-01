/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { BrowserInterface } from '@agent-infra/browser';
import { describe, expect, it, vi } from 'vitest';

import { BrowserSearch } from './browser-search';
import type { SearchResult } from './types';

describe('BrowserSearch', () => {
  it('filters excluded domains before visiting result pages', async () => {
    const searchResults: SearchResult[] = [
      {
        title: 'Excluded domain',
        url: 'https://example.com/ignored',
        snippet: 'excluded',
        content: '',
      },
      {
        title: 'Excluded subdomain',
        url: 'https://docs.example.com/ignored',
        snippet: 'excluded',
        content: '',
      },
      {
        title: 'Hostname lookalike',
        url: 'https://example.com.evil.test/allowed',
        snippet: 'allowed',
        content: '',
      },
      {
        title: 'Allowed domain',
        url: 'https://allowed.test/page',
        snippet: 'allowed',
        content: '',
      },
    ];
    const evaluateOnNewPage = vi.fn(async ({ url }: { url: string }) => {
      if (url.startsWith('https://www.google.com/search?')) {
        return searchResults;
      }

      return {
        title: `Visited ${url}`,
        content: `<p>Content from ${url}</p>`,
      };
    });
    const browser = {
      launch: vi.fn(),
      close: vi.fn(),
      evaluateOnNewPage,
    } as unknown as BrowserInterface;
    const search = new BrowserSearch({ browser });

    const results = await search.perform({
      query: 'test query',
      excludeDomains: [
        ' HTTPS://*.Example.COM/path ',
        'example.com',
        '',
        '://invalid',
      ],
      needVisitedUrls: true,
    });

    expect(results.map(({ url }) => url)).toEqual([
      'https://example.com.evil.test/allowed',
      'https://allowed.test/page',
    ]);
    const searchUrl = new URL(evaluateOnNewPage.mock.calls[0][0].url);
    expect(searchUrl.searchParams.get('q')).toBe(
      '-site:example.com test query',
    );
    expect(evaluateOnNewPage.mock.calls.map(([{ url }]) => url)).toEqual([
      expect.stringContaining('https://www.google.com/search?'),
      'https://example.com.evil.test/allowed',
      'https://allowed.test/page',
    ]);
    expect(browser.launch).toHaveBeenCalledOnce();
    expect(browser.close).toHaveBeenCalledOnce();
  });
});
