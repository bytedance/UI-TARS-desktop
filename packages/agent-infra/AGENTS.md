# AGENTS: packages/agent-infra

## OVERVIEW
Infrastructure package family for browser tooling, MCP clients/servers, search integrations, logging, scaffolding, and shared primitives.

## STRUCTURE
```text
packages/agent-infra/
|- mcp-servers/
|- mcp-client/
|- mcp-http-server/
|- browser/
|- browser-use/
|- search/
|- shared/
`- logger/
```

## WHERE TO LOOK
- MCP implementations: `mcp-servers/*/src/*`
- Browser orchestration: `browser/*`, `browser-use/*`
- Search providers: `search/*`
- Reusable contracts: `shared/src/*`

## CONVENTIONS
- Treat each package as an independent module with its own config/test.
- Keep transport/protocol contracts explicit; avoid hidden cross-package coupling.
- Prefer integration-style tests in `tests/` folders for mcp and server packages.

## ANTI-PATTERNS
- Do not embed app-specific UI behavior here.
- Do not collapse separate mcp server packages into one ad-hoc module.
- Do not skip protocol-level tests when modifying tool schemas/handlers.

## COMMANDS
```bash
pnpm --filter @agent-infra/mcp-servers-browser test
pnpm --filter @agent-infra/mcp-http-server test
pnpm --filter @agent-infra/browser-use test
```
