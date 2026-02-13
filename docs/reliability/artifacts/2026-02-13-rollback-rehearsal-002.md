# Rollback Rehearsal 002

- Date: 2026-02-13
- Commit under validation: `ce12f9571e24315ed0f349be75997525fab85857`

## Scope

Validate rollback behavior for active reliability flags and fallback semantics for new sessions.

## Command

```bash
cd apps/ui-tars
pnpm vitest run src/main/store/featureFlags.test.ts src/main/tools/invokeGateOperator.test.ts --reporter=verbose
```

## Results

- Test files: `2 passed`
- Tests: `21 passed`

## Verified rollback expectations

- `ffToolRegistry`: defaults to disabled when no override provided (`featureFlags.test.ts`).
- `ffInvokeGate`: disabled mode passes through unknown actions (`invokeGateOperator.test.ts` test: "passes through actions when invoke gate is disabled").
- `ffToolFirstRouting`: disabled mode skips tool-first router and uses visual operator path (`invokeGateOperator.test.ts` test: "skips tool-first routing when ffToolFirstRouting is disabled").
- `ffConfidenceLayer`: disabled by default in resolved feature-flag set (`featureFlags.test.ts`).
- `ffLoopGuardrails`: disabled by default in resolved feature-flag set (`featureFlags.test.ts`).

Fallback validation outcome: when rollback toggles are disabled, new session execution uses pass-through visual path and does not require tool-first routing.
