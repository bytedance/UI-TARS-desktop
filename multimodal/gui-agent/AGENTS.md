# AGENTS: multimodal/gui-agent

## OVERVIEW
GUI-agent package family: action parser, agent SDK, operator backends (adb/browser/nutjs/aio), shared types/utils, and CLI.

## WHERE TO LOOK
- Action parsing logic/tests: `action-parser/*`
- Agent SDK interfaces: `agent-sdk/*`
- Operator adapters: `operator-*/*`
- Shared contracts/helpers: `shared/*`

## CONVENTIONS
- Operator-specific behavior stays in `operator-*` packages.
- Parsing contracts and transformations belong in `action-parser` and shared modules.
- Keep shared types in `shared/src/types/*` to avoid drift across operators.

## ANTI-PATTERNS
- Do not copy parser/operator logic across packages.
- Do not introduce new operator actions without parser and serialization updates.
- Do not embed runtime side effects in shared pure helper modules.

## COMMANDS
```bash
cd multimodal/gui-agent
pnpm -r test
pnpm -r build
```

## HANDOFF
- If action formats change, synchronize parser tests and shared type definitions in the same change set.
- Keep operator package notes updated when adding new platform-specific behavior.
