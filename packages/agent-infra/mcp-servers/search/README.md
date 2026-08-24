# MCP Server Search

Run the server with browser search:

```sh
npx @agent-infra/mcp-server-search --provider=browser_search --engine=google
```

## Search X posts with Xquik

Use Xquik when an agent needs structured Twitter search results from current X
posts. The provider returns text, authors, timestamps, engagement counts, and
canonical URLs.

Set the API key through the environment. This keeps it out of shell history and
process arguments.

```sh
export X_TWITTER_SCRAPER_API_KEY="your-api-key"
npx @agent-infra/mcp-server-search --provider=xquik --count=10
```

The query supports X search operators such as `from:username` and quoted
phrases. The API key needs enough Xquik credits. Each returned post uses 1
credit. See the [Xquik search API](https://docs.xquik.com/api-reference/x/search-tweets)
for supported filters.

Xquik is an independent third-party service. Not affiliated with X Corp.
"Twitter" and "X" are trademarks of X Corp.
