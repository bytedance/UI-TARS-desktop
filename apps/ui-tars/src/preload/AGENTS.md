# AGENTS: apps/ui-tars/src/preload

## OVERVIEW
Preload bridge layer for Electron security boundary. Exposes safe renderer-facing APIs and subscriptions.

## WHERE TO LOOK
- Bridge entry and exposed APIs: `index.ts`
- Allowed channels and invoke wrappers: `index.ts` (`electronHandler.ipcRenderer`)
- Settings bridge and subscriptions: `index.ts` (`setting.*`, `onUpdate`)
- Auth bridge: `index.ts` (`codexAuth.*`)
- State bridge: `index.ts` (`zustandBridge`)

## CONVENTIONS
- Keep preload as a thin bridge; business logic belongs in `apps/ui-tars/src/main/*`.
- Expose minimal, explicit surface area via `contextBridge.exposeInMainWorld`.
- Keep API names stable (`window.electron`, `window.zustandBridge`, `window.platform`).
- Prefer typed payloads and typed return promises for bridge methods.

## SKILLS MEMORY
- Inherit skills baseline and invocation policy from `UI-TARS-desktop/AGENTS.md`.
- Lock source of truth: workspace `.agents/skills-lock.json` (outside this repo root).
- Preload hardening should prefer: `git-master`, `threat-mitigation-mapping`.
- Replacement mapping: `defense-in-depth -> threat-mitigation-mapping`.

## ANTI-PATTERNS
- Do not expose raw privileged objects beyond controlled wrappers.
- Do not add ad-hoc channels without matching main-process handlers.
- Do not bypass sanitize/contract expectations when forwarding state to renderer.
- Do not duplicate logic already implemented in main services.

## COMMANDS
```bash
cd apps/ui-tars
pnpm run typecheck:node
pnpm run test -- src/main/ipcRoutes/window.test.ts
```

## HANDOFF
- If you add or rename a bridge method, update main IPC route contracts and renderer usage in the same change.
- Validate that new bridge APIs keep renderer isolated from privileged Electron capabilities.
