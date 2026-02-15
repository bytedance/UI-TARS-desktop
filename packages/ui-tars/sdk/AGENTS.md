# AGENTS: packages/ui-tars/sdk

## OVERVIEW
`@ui-tars/sdk` is the core automation SDK surface (`GUIAgent`, model abstractions, shared status/types, utility transforms).

## WHERE TO LOOK
- Public exports: `src/index.ts`, `src/core.ts`
- Model/request behavior: `src/Model.ts`
- Agent orchestration: `src/GUIAgent.ts`
- Shared transformations: `src/utils.ts`
- Tests/fixtures: `tests/*`

## CONVENTIONS
- Keep API-compatible exports stable (`package.json` exports map).
- Add tests for behavior changes in request formatting, retry, stream handling, and parsing.
- Prefer pure helpers in `utils.ts` for reusable transforms.

## ANTI-PATTERNS
- Do not patch app-specific runtime state into SDK internals.
- Do not weaken typing contracts for convenience.
- Do not add model/provider behavior without test coverage.

## COMMANDS
```bash
cd packages/ui-tars/sdk
pnpm run build
pnpm run test
pnpm run test:browser
```

## HANDOFF
Document any SDK API surface changes in this file and keep tests updated before release.
