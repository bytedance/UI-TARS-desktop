---
"@agent-infra/search": minor
"@agent-infra/shared": minor
---

Add Firecrawl as a first-class search provider.

`@agent-infra/shared` gains `SearchProvider.Firecrawl`, and `@agent-infra/search`
adds a `firecrawl` provider (wrapping the `firecrawl` SDK) to the unified
`SearchClient`, alongside the existing browser/Bing/Tavily/DuckDuckGo/SearXNG
providers. Firecrawl's `/search` returns clean, LLM-ready markdown for every
result in a single call; pass `scrapeOptions` to retrieve full-page content.
