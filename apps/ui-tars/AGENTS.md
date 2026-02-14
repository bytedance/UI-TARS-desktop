# AGENTS: apps/ui-tars

## OVERVIEW
`apps/ui-tars` is the Electron desktop application package; it owns main/preload/renderer runtime, local/remote operator UX, packaging, and e2e tests.

## STRUCTURE
```text
apps/ui-tars/
|- src/main/       # Electron main process
|- src/preload/    # context bridge API
|- src/renderer/   # React renderer
|- e2e/            # Playwright app tests
`- package.json    # app-level scripts/build/publish
```

## WHERE TO LOOK
- App startup/lifecycle: `src/main/main.ts`
- Agent run orchestration: `src/main/services/runAgent.ts`
- IPC routes: `src/main/ipcRoutes/*`
- Renderer routes/layout: `src/renderer/src/App.tsx`
- Settings/UI integration: `src/renderer/src/components/Settings/*`
- Packaging/publish: `package.json`, `electron-builder.yml`

## COMMANDS
```bash
cd apps/ui-tars
pnpm run dev
pnpm run dev:w
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run build
```

## CONVENTIONS
- Keep security boundary: main owns privileged operations; renderer consumes preload APIs.
- Use existing ipc route pattern under `src/main/ipcRoutes` instead of ad-hoc channels.
- Keep renderer state logic in hooks/store modules; avoid direct platform calls in UI components.

## SKILLS MEMORY
- Inherit skills baseline and invocation policy from `UI-TARS-desktop/AGENTS.md`.
- Lock source of truth: workspace `.agents/skills-lock.json` (outside this repo root).
- Explicit-only skills: `debugging-strategies`, `e2e-testing-patterns`, `git-master`, `playwright-cli`, `using-git-worktrees`, `finishing-a-development-branch`.
- Replacement mapping: `root-cause-tracing -> debugging-strategies`, `condition-based-waiting -> e2e-testing-patterns`, `defense-in-depth -> threat-mitigation-mapping`.

## ANTI-PATTERNS
- Do not expose `ipcRenderer` directly to renderer.
- Do not mix business logic into `main.ts`; place into services/utils and route handlers.
- Do not wire new operator logic directly in UI without matching main-process support.
