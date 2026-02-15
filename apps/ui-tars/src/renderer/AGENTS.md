# AGENTS: apps/ui-tars/src/renderer

## OVERVIEW
Renderer layer: React app shell, routes/pages/components, local stores/hooks, and UI-triggered calls into preload-exposed APIs.

## WHERE TO LOOK
- Entry and router: `src/main.tsx`, `src/App.tsx`
- Main page flows: `src/pages/*`
- Operator/chat UI: `src/components/ChatInput/*`, `src/hooks/useRunAgent.ts`
- Settings UX: `src/components/Settings/*`, `src/hooks/useSetting.ts`
- Local persistence: `src/db/*`, `src/store/*`

## CONVENTIONS
- Renderer communicates through `window.electron`/`api.ts` abstractions, not raw Electron imports.
- State is hook/store-first (zustand + custom hooks); keep side effects in hooks.
- UI primitives are centralized under `components/ui/*` and reused across features.

Global policies (GO gate, lock sources, explicit-only rules, setup anti-drift) are inherited from root `AGENTS.md`.

## ANTI-PATTERNS
- Do not access Node/Electron privileged APIs directly from components.
- Do not bypass shared hooks/store for cross-page state.
- Do not hardcode provider/model lists in multiple places; centralize constants/config sources.

## COMMANDS
```bash
cd apps/ui-tars
pnpm run typecheck:web
pnpm run test
pnpm run test:e2e
```

## HANDOFF
If a change touches Electron privileges or IPC contracts, coordinate with `apps/ui-tars/src/main` guidance before implementing.
