# Firecrawl provider

[Firecrawl](https://firecrawl.dev) is a web-data API for AI agents: it searches
the web and returns **clean, LLM-ready markdown** for every result in a single
call. This package wires Firecrawl in as a first-class `SearchProvider`
(alongside `browser_search`, `tavily`, `bing_search`, `duckduckgo`, `searxng`)
and Agent TARS additionally exposes a `web_fetch` tool when Firecrawl is the
configured provider.

## Usage

```ts
import { SearchClient, SearchProvider } from '@agent-infra/search';

const client = new SearchClient({
  provider: SearchProvider.Firecrawl,
  providerConfig: { apiKey: process.env.FIRECRAWL_API_KEY }, // optional: keyless free tier exists
});

// Plain search (snippets)
await client.search({ query: 'UI-TARS', count: 5 });

// Search + full-page content in one call (Firecrawl's differentiator)
await client.search(
  { query: 'UI-TARS', count: 5 },
  { scrapeOptions: { formats: ['markdown'], onlyMainContent: true } },
);
```

In Agent TARS:

```ts
{
  search: {
    provider: 'firecrawl',
    apiKey: process.env.FIRECRAWL_API_KEY, // optional
    count: 10,
  },
}
```

When `provider: 'firecrawl'`, the agent gets **two** tools:

- `web_search` — discovery, optionally with full-page content per result.
- `web_fetch` — fetch any single URL as clean markdown without navigating the
  browser. Complements the existing `browser_get_markdown` (which only reads the
  tab the browser is already on).

## Why Firecrawl fits

Agent TARS today splits *find* (Tavily `web_search`) from *read* (a separate
`LinkReader` / `text_browser_view` MCP). Firecrawl's `/search` returns search
results **with** scraped content, and its `/scrape` reads arbitrary URLs — so a
single provider covers both motions, and `web_fetch` is a drop-in for the
commented-out `tavily_extract` path in `omni-tars`.

## Firecrawl endpoint → Agent TARS fit

This PR ships **search + scrape**. The other endpoints were evaluated:

| Endpoint | Fit | Notes |
|---|---|---|
| **search** | ✅ shipped | First-class `SearchProvider`. Returns snippets, or full markdown per result via `scrapeOptions`. |
| **scrape** | ✅ shipped | `web_fetch` tool — read any URL (incl. JS-rendered pages and PDFs) to markdown without driving the browser. |
| **map** | 🟡 good follow-up | `map(url)` returns all discoverable URLs on a site — a natural cheap "site recon" tool the agent can call before deciding what to read. Bounded, fast, low risk. Recommended next addition. |
| **crawl** | 🟡 careful | `crawl()` is async and can return many large pages — risks long latency and blowing the context window inside a synchronous agent loop. Viable only as an opt-in tool with a hard `limit`; better suited to a batch/offline job than the interactive loop. |
| **parse** | 🟡 niche | `parse()` converts an **uploaded local file** (pdf/docx/xlsx/html) to markdown. Pairs with Agent TARS's filesystem environment ("read this local PDF"), but URL-hosted PDFs are already handled by `scrape`. Low-priority, real. |
| **monitor** | ❌ out of scope | Firecrawl Monitoring is a **scheduled change-tracking** product (watch a page/site over time, diff, notify). That's a cron/background capability, not an interactive agent tool — Agent TARS has no scheduled-task surface to host it today. |

## Cost note

Plain search is 2 credits / 10 results. Adding `scrapeOptions` applies scrape
costs per result (1 credit/page basic). `web_fetch` is 1 credit/page. Keep
`scrapeOptions` off `web_search` unless you need content from *every* result;
otherwise search first, then `web_fetch` only the URLs you want.
