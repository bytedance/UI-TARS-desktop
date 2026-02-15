# AGENTS: multimodal/tarko

## OVERVIEW
Largest multimodal subtree: agent runtime, UI, model provider, config loader, context engineering, llm clients, and server variants.

## WHERE TO LOOK
- Agent core: `agent/src/*`, tests in `agent/tests/*`
- CLI: `agent-cli/*`
- UI layers: `ui/*`, `agent-ui/*`, `agent-ui-builder/*`
- LLM/provider: `llm/*`, `llm-client/*`, `model-provider/*`
- Server interfaces: `agent-server/*`, `agent-server-next/*`, `agent-interface/*`

## CONVENTIONS
- Maintain strict package boundaries; avoid direct coupling between UI and core packages.
- Keep test-heavy changes near existing suite style (`*.test.ts` under package `tests/`).
- Use shared utils/config packages instead of ad-hoc duplication.

## ANTI-PATTERNS
- Do not push cross-cutting logic into one mega package.
- Do not skip agent/tool-call tests for protocol changes.
- Do not keep environment-specific values hardcoded in package sources.

## COMMANDS
```bash
cd multimodal/tarko
pnpm -r test
pnpm -r build
```

## HANDOFF
- Keep package-local AGENTS updates close to the package you change.
