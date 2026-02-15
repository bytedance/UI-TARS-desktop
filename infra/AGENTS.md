# AGENTS: infra

## OVERVIEW
Infrastructure workspace for release/build tooling, currently centered on `infra/pdk` scripts and utilities.

## WHERE TO LOOK
- CLI and commands: `pdk/src/cli.ts`, `pdk/src/commands/*`
- Utility helpers: `pdk/src/utils/*`
- Tests/config: `pdk/src/__tests__/*`, `pdk/vitest.config.ts`

## CONVENTIONS
- Keep infra scripts deterministic and scriptable in CI.
- Ensure command modules stay small and focused; shared logic goes to `utils`.
- Maintain tests for release/tag/version related behaviors.

## ANTI-PATTERNS
- Do not embed environment-specific secrets or machine paths.
- Do not couple infra command behavior to one product subtree unless explicitly intended.
- Do not bypass tests when modifying release/version workflows.

## COMMANDS
```bash
cd infra/pdk
pnpm run test
pnpm run build
```

## HANDOFF
- Cross-check root workflow files in `.github/workflows/*` before changing infra scripts.
- Keep release/tag behavior documented near the script entrypoint.
