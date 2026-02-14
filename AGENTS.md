# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-14
**Commit:** 808aa697
**Branch:** main

## OVERVIEW
Large pnpm/turbo monorepo with one Electron desktop app (`apps/ui-tars`) and two major shared stacks (`packages/*`, `multimodal/*`) plus infra tooling (`infra/*`).

## STRUCTURE
```text
UI-TARS-desktop/
|- apps/ui-tars/           # desktop runtime: main/preload/renderer/e2e
|- packages/ui-tars/       # SDK/operators/IPC/parser/shared libs
|- packages/agent-infra/   # MCP/browser/search infra packages
|- multimodal/             # nested workspace (agent-tars/gui-agent/omni-tars/tarko)
|- infra/                  # pdk release/build tooling
|- docs/                   # product + reliability docs
`- .github/workflows/      # CI/E2E/release pipelines
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| App bootstrap/lifecycle | `apps/ui-tars/src/main/main.ts` | main process entry and wiring |
| Renderer entry and UI | `apps/ui-tars/src/renderer/src/main.tsx` | React shell and routes |
| Bridge and security boundary | `apps/ui-tars/src/preload/index.ts` | renderer-safe API exposure |
| IPC contracts | `apps/ui-tars/src/main/ipcRoutes/*` | route-based IPC handlers |
| SDK core behavior | `packages/ui-tars/sdk/src/*` | model, agent, transform logic |
| MCP/search/browser infra | `packages/agent-infra/*` | tool and protocol layer |
| Multimodal stacks | `multimodal/*` | independent workspace conventions |

## CODE MAP
- LSP TypeScript server not available in this environment; use grep/AST-grep.
- JSON validation fallback: use `biome check <file.json>` when JSON LSP diagnostics are unavailable in this environment.
- YAML validation fallback: use `python -m yamllint <file.yml>` when YAML LSP diagnostics are unavailable in this environment.
- High-centrality entry files: `apps/ui-tars/src/main/main.ts`, `apps/ui-tars/src/preload/index.ts`, `apps/ui-tars/src/renderer/src/main.tsx`, `packages/ui-tars/sdk/src/index.ts`.

## SKILLS BASELINE (PLAN MEMORY)
- Skills lock source of truth: `../.agents/skills-lock.json` (relative to `UI-TARS-desktop`).
- Validate skills before execution waves: `npx skills list -a opencode -a codex`.
- Installed skills for OpenCode/Codex: `debugging-strategies`, `e2e-testing-patterns`, `electron-skills`, `executing-plans`, `finishing-a-development-branch`, `git-master`, `playwright-cli`, `pnpm`, `systematic-debugging`, `test-driven-development`, `threat-mitigation-mapping`, `using-git-worktrees`, `verification-before-completion`, `vitest`, `writing-plans`.
- Explicit-only skills (no implicit invocation): `debugging-strategies`, `e2e-testing-patterns`, `git-master`, `playwright-cli`, `using-git-worktrees`, `finishing-a-development-branch`.
- Locked replacement mapping: `root-cause-tracing -> debugging-strategies`, `condition-based-waiting -> e2e-testing-patterns`, `defense-in-depth -> threat-mitigation-mapping`.
- If skill inventory changes, update both `../.agents/skills-lock.json` and `.sisyphus/plans/ui-tars-next-vector-hybrid-stabilization-exec-host.md` preflight checks.

## CONVENTIONS
- Toolchain: pnpm workspace + turbo (`package.json`, `pnpm-workspace.yaml`, `turbo.json`).
- Formatting: `.editorconfig` + `.prettierrc.mjs` (2-space, LF, semicolons, single quotes, trailing commas).
- Linting: `.eslintrc.cjs` is intentionally relaxed; keep quality high even where rules are off.
- Typing: root/app tsconfig split (`tsconfig.json`, `apps/ui-tars/tsconfig.node.json`, `apps/ui-tars/tsconfig.web.json`).
- Hooks: Husky + lint-staged + secretlint + commitlint (`.husky/*`, `.lintstagedrc.mjs`, `.commitlintrc.cjs`).
- Security: never commit secrets; honor `.secretlintrc.json` and `.secretlintignore`.

## ANTI-PATTERNS (THIS PROJECT)
- Do not bypass preload/context bridge for renderer-to-main calls.
- Do not expose privileged Electron APIs directly to renderer components.
- Do not mix root workspace assumptions into `multimodal/` or `infra/` command flows.
- Do not hand-edit generated release artifacts.
- Do not commit unrelated untracked `AGENTS.md` files.

## UNIQUE STYLES
- `multimodal/` and `infra/` are semi-independent workspaces and require Node `>=22`; root is Node `>=20`.
- App code favors route-based IPC and thin `main.ts` wiring with service modules.
- Test style is Vitest-first with focused mocking (`vi.mock`, `vi.hoisted`) and Playwright e2e under `apps/ui-tars/e2e`.

## COMMANDS
```bash
# root
pnpm install
pnpm run dev:ui-tars
pnpm run format
pnpm run lint
pnpm run test
pnpm run coverage
npm exec turbo run typecheck
npm exec turbo run ui-tars-desktop#test:e2e

# single test examples
pnpm run test -- apps/ui-tars/src/main/ipcRoutes/window.test.ts
pnpm run test -- -t "should call showWindow function"
cd apps/ui-tars && pnpm run test:e2e -- e2e/teach-mode.spec.ts

# nested workspaces
cd multimodal && pnpm bootstrap && pnpm test && pnpm build
cd infra && pnpm test && pnpm build
```

## NOTES
- Cursor/Copilot rule files not found at scan time: `.cursorrules`, `.cursor/rules/*`, `.github/copilot-instructions.md`.
- `node_modules/**/AGENTS.md` copies are not authoritative project guidance.
- New local scope guides were added for app preload and e2e to reduce boundary/test ambiguity.

## SCOPE OVERRIDES
Child guides override this root file in their subtree:
- `apps/ui-tars/AGENTS.md`
- `apps/ui-tars/src/main/AGENTS.md`
- `apps/ui-tars/src/preload/AGENTS.md`
- `apps/ui-tars/src/renderer/AGENTS.md`
- `apps/ui-tars/e2e/AGENTS.md`
- `packages/ui-tars/AGENTS.md`
- `packages/ui-tars/sdk/AGENTS.md`
- `packages/agent-infra/AGENTS.md`
- `packages/agent-infra/mcp-servers/AGENTS.md`
- `multimodal/AGENTS.md`
- `multimodal/benchmark/AGENTS.md`
- `multimodal/websites/AGENTS.md`
- `multimodal/agent-tars/AGENTS.md`
- `multimodal/gui-agent/AGENTS.md`
- `multimodal/omni-tars/AGENTS.md`
- `multimodal/tarko/AGENTS.md`
- `infra/AGENTS.md`
