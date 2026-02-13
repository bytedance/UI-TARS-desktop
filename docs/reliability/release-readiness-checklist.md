# Release Readiness Checklist (Reliability Migration)

Use this checklist to decide if the migration plan is fully complete.

## A. Traceability

- [ ] All plan slices `PR-00..PR-17` mapped in `docs/reliability/migration-traceability-matrix.md`
- [ ] Any numbering drift between plan PR IDs and GitHub PR numbers documented
- [ ] Any embedded slices (for example `PR-10a`) explicitly called out

## B. Baseline + KPI evidence

- [ ] Baseline harness protocol exists (`docs/reliability/baseline-harness-runbook.md`)
- [ ] Baseline artifact report exists using required metrics
- [ ] Two consecutive KPI gate reports exist and pass thresholds
- [ ] Raw run data linked for every report

## C. Phase DoD evidence

- [ ] P0 regression evidence attached
- [ ] P1 deterministic tool path evidence attached
- [ ] P2 taxonomy/retry/recovery evidence attached
- [ ] P3 confidence/loop-breaker/observability evidence attached

## D. Rollback rehearsal evidence

- [ ] Rehearsal completed for active reliability flags:
  - [ ] `ffToolRegistry`
  - [ ] `ffInvokeGate`
  - [ ] `ffToolFirstRouting`
  - [ ] `ffConfidenceLayer`
  - [ ] `ffLoopGuardrails`
- [ ] Fallback behavior validated for new sessions
- [ ] Rollback logs/artifacts stored and linked

## E. Global sign-off

- [ ] No P0/P1 regressions in smoke/e2e suite
- [ ] Operations docs updated (contracts, flags, runbooks)
- [ ] Final approval note includes commit/PR references and report links
