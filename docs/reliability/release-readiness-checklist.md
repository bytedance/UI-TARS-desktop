# Release Readiness Checklist (Reliability Migration)

Use this checklist to decide if the migration plan is fully complete.

## A. Traceability

- [x] All plan slices `PR-00..PR-17` mapped in `docs/reliability/migration-traceability-matrix.md`
- [x] Any numbering drift between plan PR IDs and GitHub PR numbers documented
- [x] Any embedded slices (for example `PR-10a`) explicitly called out

## B. Baseline + KPI evidence

- [x] Baseline harness protocol exists (`docs/reliability/baseline-harness-runbook.md`)
- [x] Baseline artifact report exists using required metrics
- [x] Two consecutive KPI gate reports exist and pass thresholds
- [x] Raw run data linked for every report

## C. Phase DoD evidence

- [x] P0 regression evidence attached
- [x] P1 deterministic tool path evidence attached
- [x] P2 taxonomy/retry/recovery evidence attached
- [x] P3 confidence/loop-breaker/observability evidence attached

## D. Rollback rehearsal evidence

- [x] Rehearsal completed for active reliability flags:
  - [x] `ffToolRegistry`
  - [x] `ffInvokeGate`
  - [x] `ffToolFirstRouting`
  - [x] `ffConfidenceLayer`
  - [x] `ffLoopGuardrails`
- [x] Fallback behavior validated for new sessions
- [x] Rollback logs/artifacts stored and linked

## E. Global sign-off

- [x] No P0/P1 regressions in smoke/e2e suite
- [x] Operations docs updated (contracts, flags, runbooks)
- [x] Final approval note includes commit/PR references and report links

## F. Current closure snapshot (2026-02-13)

- Merged closure PRs: `#20`, `#21`, `#22`, `#23`, `#24`, `#25`
- Ops/sign-off runbook: `docs/reliability/operations-signoff-runbook.md`
- New measured KPI evidence set:
  - baseline: `docs/reliability/artifacts/2026-02-13-baseline-run-002.report.json`
  - gate: `docs/reliability/artifacts/2026-02-13-gate-run-003.report.json`, `docs/reliability/artifacts/2026-02-13-gate-run-004.report.json`
  - two-run gate output: `docs/reliability/artifacts/2026-02-13-gate-run-003-004.gate.json`
- Regression evidence: `docs/reliability/artifacts/2026-02-13-phase-regression-evidence.md`
- Rollback rehearsal evidence: `docs/reliability/artifacts/2026-02-13-rollback-rehearsal-002.md`
- Final approval note: `docs/reliability/artifacts/2026-02-13-final-approval-note.md` (`Decision: APPROVED`)
- Org-trace closure record: `docs/reliability/closure/2026-02-13-org-trace-record.md`
- Release tag and packaged archive:
  - tag/release: `reliability-migration-closed-2026-02-13`
  - archive: `docs/reliability/closure/2026-02-13-reliability-evidence.tar.gz`
  - checksums: `docs/reliability/closure/2026-02-13-evidence-checksums.sha256`
