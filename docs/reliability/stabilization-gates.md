# Stabilization Gate Matrix

Task: 0 (Baseline Contract + Scope Lock)
Plan: `../.sisyphus/plans/ui-tars-next-vector-hybrid-stabilization-exec-host.md`

Canonical deterministic command matrix:

```bash
cd UI-TARS-desktop && npx eslint . --ext .js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --max-warnings=0
cd UI-TARS-desktop && npm exec turbo run typecheck
cd UI-TARS-desktop && CI=1 pnpm exec vitest run
cd UI-TARS-desktop/apps/ui-tars && pnpm run build:e2e
cd UI-TARS-desktop/apps/ui-tars && pnpm run test:e2e -- --retries=0 e2e/app.test.ts
cd UI-TARS-desktop/apps/ui-tars && pnpm run test:e2e -- --retries=0 e2e/teach-mode.spec.ts
```

Rules:
- Do not use `pnpm run test -- ...` for acceptance in this plan.
- Use one-shot mode only (`pnpm exec vitest run ...`) for deterministic checks.
- Do not rely on retry masking for E2E acceptance.
