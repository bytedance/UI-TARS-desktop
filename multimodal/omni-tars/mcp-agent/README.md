@multimodal/seed-mcp-agent

## configure model and mcp apiKey

```
# model proxy
export OMNI_TARS_BASE_URL=""
# model apikey
export OMNI_TARS_API_KEY=""
# model id
export OMNI_TARS_MODEL_ID=""
# tavily api key
export TAVILY_API_KEY=""
# google search mcp url
export GOOGLE_MCP_URL=""
# google search api key
export GOOGLE_API_KEY=""
```

## local startup

```bash
pnpm dev:agent
```

## Custom MCP Servers

```typescript
const mcpPlugin = new McpAgentPlugin({
  googleApiKey: 'key',
  tavilyApiKey: 'key',
  mcpServers: [
    {
      name: 'file-server',
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '/workspace'],
    },
  ],
});
```
