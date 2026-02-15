# AGENTS: packages/ui-tars

## OVERVIEW
Core reusable UI-TARS libraries: SDK, operators, CLI, shared types/constants, electron IPC helpers, action parser, UTIO, and visualizer.

## STRUCTURE
```text
packages/ui-tars/
|- sdk/
|- operators/
|- electron-ipc/
|- action-parser/
|- cli/
|- shared/
`- utio/
```

## WHERE TO LOOK
- SDK runtime/types: `sdk/src/*`
- Operator adapters: `operators/*/src/*`
- IPC toolkit: `electron-ipc/src/*`
- Parsed action formats: `action-parser/src/*`
- Shared contracts: `shared/src/*`

## CONVENTIONS
- Packages are independently buildable/testable; use per-package scripts/configs.
- Keep cross-package interfaces in `shared` and re-export via package index files.
- Favor small package-local tests over broad integration tests in this layer.

## ANTI-PATTERNS
- Do not create circular package dependencies.
- Do not leak app-specific concerns from `apps/ui-tars` into reusable packages.
- Do not change exported signatures without updating affected package tests.

## COMMANDS
```bash
pnpm --filter @ui-tars/sdk test
pnpm --filter @ui-tars/action-parser test
pnpm --filter @ui-tars/electron-ipc test
```
