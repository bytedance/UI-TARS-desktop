# AGENTS: packages/agent-infra/mcp-servers

## OVERVIEW
MCP server implementations grouped by capability (`browser`, `filesystem`, `commands`, `search`).

## WHERE TO LOOK
- Browser server/tool handlers: `browser/src/*`, `browser/tests/*`
- Filesystem server: `filesystem/src/*`
- Commands server: `commands/src/*`
- Search server: `search/src/*`

## CONVENTIONS
- Keep handler interfaces predictable and mirrored in tests.
- Add test coverage in each package for new tools/resources/routes.
- Preserve package boundaries; shared primitives should come from `@agent-infra/mcp-shared`.

## ANTI-PATTERNS
- Do not add tools without schema/validation and tests.
- Do not use cross-package imports that bypass published interfaces.
- Do not hardcode environment assumptions in server logic.

## COMMANDS
```bash
pnpm --filter @agent-infra/mcp-servers-browser test
pnpm --filter @agent-infra/mcp-servers-filesystem test
pnpm --filter @agent-infra/mcp-servers-commands test
pnpm --filter @agent-infra/mcp-servers-search test
```

## HANDOFF
If you add/change a tool contract, update package tests and any shared schema references in the same change.
