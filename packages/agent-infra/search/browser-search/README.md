# @agent-infra/browser-search

<p>
  <a href="https://npmjs.com/package/@agent-infra/browser-search?activeTab=readme"><img src="https://img.shields.io/npm/v/@agent-infra/browser-search?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>
  <a href="https://npmcharts.com/compare/@agent-infra/browser-search?minimal=true"><img src="https://img.shields.io/npm/dm/@agent-infra/browser-search.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
  <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/@agent-infra/browser-search.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="node version"></a>
  <a href="https://github.com/web-infra-dev/rsbuild/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" /></a>
</p>

A tiny stealth-mode web search and content extraction library built on top of Puppeteer, inspired by [EGOIST](https://github.com/egoist)'s [local-web-search](https://github.com/egoist/local-web-search).

## Features

- 🔍 **Multi-Engine Search** - Support for Google, Bing, and Baidu search engines
- 📑 **Content Extraction** - Extract readable content from web pages using Readability
- 🚀 **Concurrent Processing** - Built-in queue system for efficient parallel processing
- 🛡️ **Stealth Mode** - Advanced browser fingerprint spoofing
- 📝 **Markdown Output** - Automatically converts HTML content to clean Markdown
- ⚡ **Performance Optimized** - Smart request interception for faster page loads

## Installation

```bash
npm install @agent-infra/browser-search
# or
yarn add @agent-infra/browser-search
# or
pnpm add @agent-infra/browser-search
```

## Quick Start

```typescript
import { BrowserSearch } from '@agent-infra/browser-search';
import { ConsoleLogger } from '@agent-infra/logger';

// Create a logger (optional)
const logger = new ConsoleLogger('[BrowserSearch]');

// Initialize the search client
const browserSearch = new BrowserSearch({
  logger,
  browserOptions: {
    headless: true,
  },
});

// Perform a search
const results = await browserSearch.perform({
  query: 'climate change solutions',
  count: 5,
});

console.log(`Found ${results.length} results`);
results.forEach((result) => {
  console.log(`Title: ${result.title}`);
  console.log(`URL: ${result.url}`);
  console.log(`Content preview: ${result.content.substring(0, 150)}...`);
});
```

## API Reference

### BrowserSearch

#### Constructor

```typescript
constructor(config?: BrowserSearchConfig)
```

Configuration options:

```typescript
interface BrowserSearchConfig {
  logger?: Logger; // Custom logger
  browser?: BrowserInterface; // Custom browser instance
}
```

#### perform(options)

Performs a search and extracts content from result pages.

```typescript
async perform(options: BrowserSearchOptions): Promise<SearchResult[]>
```

Search options:

```typescript
interface BrowserSearchOptions {
  query: string | string[]; // Search query or array of queries
  count?: number; // Maximum results to fetch
  concurrency?: number; // Concurrent requests (default: 15)
  excludeDomains?: string[]; // Domains to exclude
  truncate?: number; // Truncate content length
  browserOptions?: {
    headless?: boolean; // Run in headless mode
    proxy?: string; // Proxy server
    executablePath?: string; // Custom browser path
    profilePath?: string; // Browser profile path
  };
}
```

#### Response Type

```typescript
interface SearchResult {
  title: string; // Page title
  url: string; // Page URL
  content: string; // Extracted content in Markdown format
}
```

## Advanced Usage

### Multiple Queries

```typescript
const results = await browserSearch.perform({
  query: ['renewable energy', 'solar power technology'],
  count: 10, // Will fetch approximately 5 results per query
  concurrency: 5,
});
```

### Domain Exclusion

```typescript
const results = await browserSearch.perform({
  query: 'artificial intelligence',
  excludeDomains: ['reddit.com', 'twitter.com', 'youtube.com'],
  count: 10,
});
```

### Content Truncation

```typescript
const results = await browserSearch.perform({
  query: 'machine learning',
  count: 5,
  truncate: 1000, // Limit content to 1000 characters
});
```

### Using with Custom Browser Instance

```typescript
import { ChromeBrowser } from '@agent-infra/browser';
import { BrowserSearch } from '@agent-infra/browser-search';

const browser = new ChromeBrowser({
  // Custom browser configuration
});

const browserSearch = new BrowserSearch({
  browser,
});

const results = await browserSearch.perform({
  query: 'typescript best practices',
});
```

## Examples

See [examples](./examples/).


## Credits

Thanks to:

- [EGOIST](https://github.com/egoist) for creating a great AI chatbot product [ChatWise](https://chatwise.app/) from which we draw a lot of inspiration for local-browser based search.
- The [puppeteer](https://github.com/puppeteer/puppeteer) project which helps us operate the browser better.

## License

Copyright (c) 2025 ByteDance, Inc. and its affiliates.

Licensed under the Apache License, Version 2.0.
