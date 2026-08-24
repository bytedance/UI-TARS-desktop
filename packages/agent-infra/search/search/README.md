# @agent-infra/search

<p>
  <a href="https://npmjs.com/package/@agent-infra/search?activeTab=readme"><img src="https://img.shields.io/npm/v/@agent-infra/search?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>
  <a href="https://npmcharts.com/compare/@agent-infra/search?minimal=true"><img src="https://img.shields.io/npm/dm/@agent-infra/search.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
  <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/@agent-infra/search.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="node version"></a>
  <a href="https://github.com/bytedance/open-agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" /></a>
</p>

An isomorphic search client that unifies multiple search providers into a single API.

## Features

- **Multi-provider support**: Use **Browser Search**, **Bing Search**, **Tavily**, or **Xquik** with the same interface
- **Unified API**: Consistent response format across all providers
- **Configurable**: Customize search parameters for each provider
- **Type-safe**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @agent-infra/search
# or
yarn add @agent-infra/search
# or
pnpm add @agent-infra/search
```

## Usage

### Basic Search

```typescript
import { Search, SearchProvider } from '@agent-infra/search';

// Create a search client with your preferred provider
const client = new SearchClient({
  provider: SearchProvider.BingSearch,
  providerConfig: {
    apiKey: 'YOUR_API_KEY',
  },
});

// Perform a search
const results = await client.search({
  query: 'climate change',
  limit: 5,
});

console.log(results);
```

### Switch Between Providers

```typescript
import { Search, SearchProvider } from '@agent-infra/search';

// Create search instances for different providers
const bingSearch = new SearchClient({
  provider: SearchProvider.BingSearch,
  providerConfig: {
    apiKey: 'YOUR_BING_API_KEY',
  },
});

const tavilySearch = new SearchClient({
  provider: SearchProvider.Tavily,
  providerConfig: {
    apiKey: 'YOUR_TAVILY_API_KEY',
  },
});

// Use browser search in browser environments
const browserSearch = new SearchClient({
  provider: SearchProvider.BrowserSearch,
  providerConfig: {
    // ... browser search config
  },
});

// Use the appropriate client based on your needs
const results = await bingSearch.search({
  query: 'UI-TARS',
});
```

### With Environment Variables

```typescript
// Set in your `.zshrc` or `.bash_profile`：
// BING_SEARCH_API_KEY=your-api-key
// BING_SEARCH_API_BASE_URL=your-api-base-url

import { Search, SearchProvider } from '@agent-infra/search';

const client = new SearchClient({
  provider: SearchProvider.BingSearch,
});

const results = await client.search({
  query: 'UI-TARS',
});
```

## API Reference

### `Search` Client

```typescript
constructor(config: SearchConfig)
```

Configuration options:

```typescript
interface SearchConfig {
  provider: SearchProvider;
  providerConfig?: {
    [key: string]: any;
  };
  logger?: Logger;
}

enum SearchProvider {
  BingSearch = 'bing',
  Tavily = 'tavily',
  BrowserSearch = 'browser',
  Xquik = 'xquik',
}
```

### `search` Method

```typescript
  async search(
    options: CommonSearchOptions,
    originalOptions?: Partial<SearchProviderSearchOptionsMap[T]>,
  ): Promise<SearchResult>
```

Common search options:

```typescript
export interface CommonSearchOptions {
  /**
   * Search query
   */
  query: string;
  /**
   * Max search count
   */
  count?: number;
}
```

### Response Type

```typescript
export type PageResult = {
  title: string;
  url: string;
  content: string;
};

export interface SearchResult {
  pages: PageResult[];
}
```

## Provider-Specific Options

### Bing Search

```typescript
const client = new SearchClient({
  provider: SearchProvider.BingSearch,
  providerConfig: {
    apiKey: 'YOUR_API_KEY',
    mkt: 'en-US',
  },
});

const results = await client.search(
  {
    query: 'UI-TARS',
    count: 5,
  },
  // Pass Bing-specific parameter via 2nd parameter
  {
    mkt: 'zh-CN', // Market code
  },
);
```

### Tavily

```typescript
const search = new SearchClient({
  provider: SearchProvider.Tavily,
  providerConfig: {
    apiKey: 'YOUR_API_KEY',
  },
});

const results = await search.search(
  {
    query: 'latest research papers',
  },
  // Tavily-specific parameters
  {
    searchDepth: 'advanced',
    includeRawContent: true,
  },
);
```

### Browser Search

```typescript
// Only available in browser environments
const client = new SearchClient({
  provider: SearchProvider.BrowserSearch,
});

const results = await client.search(
  {
    query: 'UI-TARS',
    count: 5,
  },
  // BrowserSearch-specific parameters
  {
    concurrency: 3,
  },
);
```

### Xquik

Use Xquik to search tweets and current X posts without a logged-in browser
profile. The provider maps text, authors, timestamps, engagement counts, and
canonical URLs into the unified page result.

```typescript
const client = new SearchClient({
  provider: SearchProvider.Xquik,
  providerConfig: {
    apiKey: process.env.X_TWITTER_SCRAPER_API_KEY,
  },
});

const results = await client.search(
  {
    query: 'from:openai "agent tools"',
    count: 10,
  },
  {
    queryType: 'Latest',
    verifiedOnly: true,
  },
);
```

The API key needs enough Xquik credits. Each returned post uses 1 credit. See
the [Xquik search API](https://docs.xquik.com/api-reference/x/search-tweets) for
supported filters.

Xquik is an independent third-party service. Not affiliated with X Corp.
"Twitter" and "X" are trademarks of X Corp.

## Examples

See [examples](./examples/).

## License

Copyright (c) 2025 ByteDance, Inc. and its affiliates.

Licensed under the Apache License, Version 2.0.
