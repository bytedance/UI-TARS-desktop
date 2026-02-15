# AGENTS: apps/ui-tars/src/main

## OVERVIEW
Main process layer: Electron lifecycle, window/tray, permissions, agent runtime, IPC handler registration, settings persistence.

## WHERE TO LOOK
- Bootstrap/lifecycle: `main.ts`
- IPC composition: `ipcRoutes/index.ts`
- Agent runtime: `services/runAgent.ts`, `agent/operator.ts`
- Settings persistence: `store/*`, `services/settings.ts`
- Window/tray behavior: `window/*`, `tray.ts`
- Logging and support ops: `logger.ts`, `services/*`

## CONVENTIONS
- Prefer route-based IPC via `@ui-tars/electron-ipc` wrappers.
- Keep `main.ts` as wiring-only; place logic in `services`, `utils`, `store`, `agent`.
- Sanitize state before broadcasting to renderer (`utils/sanitizeState.ts` pattern).
- Keep OS-specific logic behind utility/services modules.

Global policies (GO gate, lock sources, explicit-only rules, setup anti-drift) are inherited from root `AGENTS.md`.

## ANTI-PATTERNS
- Do not call renderer internals from main.
- Do not duplicate IPC channels when route modules already exist.
- Do not persist secrets in plain text logs or broadcast them over state subscriptions.

## COMMANDS
```bash
cd apps/ui-tars
pnpm run typecheck:node
pnpm run test
```
