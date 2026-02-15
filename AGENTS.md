# PROJECT KNOWLEDGE BASE

Generated: 2026-02-15
Scope: repository-level working memory and guardrails.

## GO GATE (MANDATORY)
- Do not start implementation unless the user gives explicit GO.
- If the user asks to research/analyze/plan only, perform read-only work and stop before edits.
- When scope is ambiguous, ask for a single GO/NO-GO clarification before coding.

## SOURCE OF TRUTH (LOCKS)
- Skills lock: `../.agents/skills-lock.json`
- Setup lock (MCP/LSP/AST/plugins): `docs/reliability/setup/tooling-setup-lock.json`
- Setup task-fit map: `docs/reliability/setup/task-fit-map.md`
- Execution plan: `.sisyphus/plans/ui-tars-next-vector-hybrid-stabilization-exec-host.md`
- Dependency lock: `pnpm-lock.yaml`

## EXPLICIT-ONLY POLICY
- Explicit-only skills: `debugging-strategies`, `e2e-testing-patterns`, `git-master`, `playwright-cli`, `using-git-worktrees`, `finishing-a-development-branch`.
- Do not implicitly switch governance mode (for example docker-only -> full-cloud) without explicit user approval.
- Do not treat marketplace/directory listings as trust roots; only pinned entries in lock files are trusted.

## CLI FALLBACKS AND ACCEPTANCE COMMANDS
- Setup baseline: `pnpm run check:setup:baseline`
- LSP probe (CLI-first): `pnpm run check:lsp:probe`
- TypeScript fallback: `pnpm --filter @ui-tars/sdk exec tsc --noEmit -p tsconfig.json`
- JSON fallback: `biome check <file.json>`
- YAML fallback: `python -m yamllint --strict <file.yml>`
- Markdown fallback: `pnpm exec prettier --check <file.md>`
- AST baseline: `pnpm run check:ast:baseline`
- MCP baseline: `pnpm run check:mcp:baseline`

## CURRENT SETUP MEMORY
- MCP governance mode is currently `docker-only`.
- Docker MCP Gateway is closed and pinned in `docs/reliability/setup/tooling-setup-lock.json`.
- Azure APIM and Microsoft MCP Gateway are deferred until subscription access exists.
- Plugin runtime is pinned and applied (OpenCode + Claude runtime entries are in setup lock).

## ANTI-DRIFT RULE
- If setup changes in skills/mcp/lsp/ast/plugins, synchronize in one change:
  1. lock files (`../.agents/skills-lock.json`, `docs/reliability/setup/tooling-setup-lock.json`)
  2. plan (`.sisyphus/plans/ui-tars-next-vector-hybrid-stabilization-exec-host.md`)
  3. AGENTS memory (root + affected child `AGENTS.md`)
- A setup change is incomplete until all three surfaces are consistent.

## MONOREPO MAP (QUICK)
- App runtime: `apps/ui-tars/` (main/preload/renderer/e2e)
- Shared libs: `packages/ui-tars/`
- MCP/browser/search infra: `packages/agent-infra/`
- Nested workspace: `multimodal/`
- Infra tooling: `infra/`

## PLAN COMMIT/PR CADENCE (MANDATORY)
- Follow checkpoint batches from `.sisyphus/plans/ui-tars-next-vector-hybrid-stabilization-exec-host.md` commit strategy.
- Do not postpone all commits/PR until final closure.
- Required checkpoint order:
  1. After Task `0`
  2. After Tasks `1-2`
  3. After Tasks `3-4`
  4. After Tasks `5-6`
  5. After Tasks `7-8`
  6. After Task `9`
- For each checkpoint: commit -> push to approved fork remote -> open/update PR -> wait for reviewer feedback before continuing fixes.

## SUBTREE OVERRIDES
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
