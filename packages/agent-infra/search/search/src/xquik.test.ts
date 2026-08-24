/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, test } from 'vitest';
import { SearchClient, SearchProvider } from './index';
import { type XquikSearchConfig, xquik } from './xquik';

const responseBody = {
  has_next_page: false,
  next_cursor: '',
  tweets: [
    {
      id: '123',
      bookmarkCount: 2,
      likeCount: 8,
      quoteCount: 1,
      replyCount: 3,
      retweetCount: 5,
      text: 'Agent search\nwith current X posts',
      viewCount: 144,
      createdAt: '2026-08-24T12:00:00.000Z',
      author: {
        id: '42',
        name: 'Ada Example',
        username: 'ada',
      },
    },
    {
      id: '456',
      bookmarkCount: 0,
      likeCount: 0,
      quoteCount: 0,
      replyCount: 0,
      retweetCount: 0,
      text: '',
      viewCount: 0,
    },
  ],
};

function createFetchRecorder() {
  const requests: Request[] = [];
  const fetch: NonNullable<XquikSearchConfig['fetch']> = async (
    input,
    init,
  ) => {
    requests.push(new Request(input, init));
    return new Response(JSON.stringify(responseBody), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  };

  return { fetch, requests };
}

describe('Xquik search provider', () => {
  test('maps X posts to unified search results', async () => {
    const { fetch } = createFetchRecorder();
    const client = xquik({
      apiKey: 'test-key',
      baseUrl: 'https://example.test/api/v1',
      fetch,
      maxRetries: 0,
    });

    const result = await client.search('agent search', { count: 2 });

    expect(result.results).toEqual([
      {
        title: '@ada: Agent search with current X posts',
        url: 'https://x.com/ada/status/123',
        content:
          'Author: Ada Example (@ada)\n' +
          'Published: 2026-08-24T12:00:00.000Z\n' +
          'Engagement: likes 8, reposts 5, replies 3, quotes 1, views 144\n\n' +
          'Agent search\nwith current X posts',
      },
      {
        title: 'X post',
        url: 'https://x.com/i/status/456',
        content:
          'Engagement: likes 0, reposts 0, replies 0, quotes 0, views 0\n\n',
      },
    ]);
  });

  test('sends the API key, bounded count, and provider filters', async () => {
    const { fetch, requests } = createFetchRecorder();
    const client = xquik({
      apiKey: 'test-key',
      baseUrl: 'https://example.test/api/v1',
      fetch,
      maxRetries: 0,
    });

    await client.search('from:ada launch', {
      count: 500,
      queryType: 'Latest',
      safe: true,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(
      'https://example.test/api/v1/x/tweets/search?queryType=Latest&safe=true&q=from%3Aada%20launch&limit=100',
    );
    expect(requests[0].headers.get('x-api-key')).toBe('test-key');
  });

  test('works through the unified SearchClient', async () => {
    const { fetch } = createFetchRecorder();
    const client = new SearchClient({
      provider: SearchProvider.Xquik,
      providerConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://example.test/api/v1',
        fetch,
        maxRetries: 0,
      },
    });

    const result = await client.search(
      { query: 'agent search', count: 2 },
      { verifiedOnly: true },
    );

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].title).toBe(
      '@ada: Agent search with current X posts',
    );
  });
});
