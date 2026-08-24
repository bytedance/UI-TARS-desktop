# MCP Server Search

Run the server with browser search:

```sh
npx @agent-infra/mcp-server-search --provider=browser_search --engine=google
```

## Search X posts with Xquik

Use Xquik when an agent needs structured Twitter search results from current X
posts. The provider returns text, authors, timestamps, engagement counts, and
canonical URLs.

Read the API key without echoing it or placing it in shell history. Then pass it
through the environment instead of a process argument.

```sh
read -s X_TWITTER_SCRAPER_API_KEY
export X_TWITTER_SCRAPER_API_KEY
npx @agent-infra/mcp-server-search --provider=xquik --count=10
```

The query supports X search operators such as `from:username` and quoted
phrases. The API key needs enough Xquik credits. Each returned post uses 1
credit. See the [Xquik search API](https://docs.xquik.com/api-reference/x/search-tweets)
for supported filters.

Xquik is an independent third-party service. Not affiliated with X Corp.
"Twitter" and "X" are trademarks of X Corp.
