/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { SearchClient, SearchProvider } from '../src';

export async function firecrawlSearch() {
  const client = new SearchClient({
    provider: SearchProvider.Firecrawl,
    providerConfig: {
      // Optional — Firecrawl has a keyless free tier (rate-limited per IP).
      apiKey: process.env.FIRECRAWL_API_KEY,
    },
  });

  const results = await client.search(
    {
      query: 'UI-TARS',
      count: 5,
    },
    {
      // Firecrawl-specific: scrape full-page markdown for every result in the
      // same call, so the agent gets grounded content rather than snippets.
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
      // tbs: 'qdr:w', // e.g. only results from the past week
    },
  );

  console.log('Firecrawl Search Results:');
  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  firecrawlSearch().catch(console.error);
}
