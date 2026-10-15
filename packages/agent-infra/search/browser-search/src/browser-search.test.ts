/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { BrowserInterface } from '@agent-infra/browser';
import type { Logger } from '@agent-infra/logger';
import { describe, expect, it, vi } from 'vitest';
import { BrowserSearch } from './browser-search';
import type { SearchResult } from './types';

const createSearchResults = (query: string): SearchResult[] =>
  Array.from({ length: 3 }, (_, index) => ({
    title: `${query}-${index}`,
    url: `https://example.com/${query}/${index}`,
    snippet: 'snippet',
    content: '',
  }));

const createBrowser = (): BrowserInterface =>
  ({
    launch: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    evaluateOnNewPage: vi.fn().mockImplementation(async ({ url }) => {
      const query = new URL(url).searchParams.get('q') || 'query';
      return createSearchResults(query);
    }),
  }) as unknown as BrowserInterface;

const logger = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
} as unknown as Logger;

describe('BrowserSearch', () => {
  it('limits results to count for a single query', async () => {
    const search = new BrowserSearch({ browser: createBrowser(), logger });

    const results = await search.perform({
      query: 'first',
      count: 1,
      needVisitedUrls: false,
    });

    expect(results).toHaveLength(1);
  });

  it('limits combined results to count for multiple queries', async () => {
    const search = new BrowserSearch({ browser: createBrowser(), logger });

    const results = await search.perform({
      query: ['first', 'second'],
      count: 4,
      needVisitedUrls: false,
    });

    expect(results).toHaveLength(4);
  });
});
