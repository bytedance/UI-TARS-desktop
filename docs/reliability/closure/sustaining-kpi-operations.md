# Sustaining KPI Operations Plan

Effective from: 2026-02-14
Scope: post-closure reliability monitoring cadence.

## Cadence

- Weekly (engineering): run one baseline KPI capture using current `main`.
- Per release candidate: run full two-run KPI gate sequence.
- Monthly (ops review): review trend deltas and rollback drill results.

## Required recurring checks

1. Baseline report generation from fresh raw runs.
2. Two-run gate pass on release candidate evidence.
3. Rollback rehearsal for active reliability flags.
4. P0/P1 no-regression test subset execution.

## Escalation rules

- If gate fails, release is blocked until a passing two-run evidence set is produced.
- If rollback rehearsal fails, keep feature-flag rollout frozen and open a new incident plan.
- If P0/P1 regressions appear, classify as release-blocking and require explicit owner approval to proceed.

## Artifacts location

- Store recurring evidence under `docs/reliability/artifacts/` with date-prefixed filenames.
- Update `docs/reliability/release-readiness-checklist.md` only for active release windows.
