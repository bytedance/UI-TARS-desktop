/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import XTwitterScraper, { type ClientOptions } from 'x-twitter-scraper';
import type { SearchTweet } from 'x-twitter-scraper/resources/shared';
import type { TweetSearchParams } from 'x-twitter-scraper/resources/x/tweets/tweets';

const DEFAULT_RESULT_COUNT = 10;
const MAX_RESULT_COUNT = 100;
const TITLE_LENGTH = 100;

export interface XquikSearchConfig {
  apiKey?: string;
  baseUrl?: string;
  fetch?: ClientOptions['fetch'];
  maxRetries?: number;
  timeout?: number;
}

export type XquikSearchOptions = Omit<
  TweetSearchParams,
  'cursor' | 'limit' | 'q'
> & {
  count?: number;
};

export interface XquikSearchResult {
  title: string;
  url: string;
  content: string;
}

function normalizeCount(count?: number): number {
  if (count === undefined || !Number.isFinite(count)) {
    return DEFAULT_RESULT_COUNT;
  }

  return Math.min(MAX_RESULT_COUNT, Math.max(1, Math.trunc(count)));
}

function formatTitle(username: string | undefined, text: string): string {
  const compactText = text.replace(/\s+/g, ' ').trim();
  const excerpt =
    compactText.length > TITLE_LENGTH
      ? `${compactText.slice(0, TITLE_LENGTH - 1)}…`
      : compactText;
  const author = username ? `@${username}` : 'X post';

  return excerpt ? `${author}: ${excerpt}` : author;
}

function formatContent(tweet: SearchTweet): string {
  const lines: string[] = [];

  if (tweet.author) {
    lines.push(`Author: ${tweet.author.name} (@${tweet.author.username})`);
  }
  if (tweet.createdAt) {
    lines.push(`Published: ${tweet.createdAt}`);
  }

  lines.push(
    `Engagement: likes ${tweet.likeCount}, reposts ${tweet.retweetCount}, replies ${tweet.replyCount}, quotes ${tweet.quoteCount}, views ${tweet.viewCount}`,
    '',
    tweet.text,
  );

  return lines.join('\n');
}

export function xquik(config: XquikSearchConfig = {}) {
  const client = new XTwitterScraper({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    fetch: config.fetch,
    maxRetries: config.maxRetries,
    timeout: config.timeout,
  });

  const search = async (
    query: string,
    options: XquikSearchOptions = {},
  ): Promise<{ results: XquikSearchResult[] }> => {
    const { count, ...searchOptions } = options;
    const response = await client.x.tweets.search({
      ...searchOptions,
      q: query,
      limit: normalizeCount(count),
    });

    return {
      results: response.tweets.map((tweet) => {
        const username = tweet.author?.username;
        const url =
          tweet.url ||
          (username
            ? `https://x.com/${username}/status/${tweet.id}`
            : `https://x.com/i/status/${tweet.id}`);

        return {
          title: formatTitle(username, tweet.text),
          url,
          content: formatContent(tweet),
        };
      }),
    };
  };

  return { search };
}
