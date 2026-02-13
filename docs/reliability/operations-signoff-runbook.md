# Reliability Operations + Sign-off Runbook

Last updated: 2026-02-13
Scope: closure operations pack for migration readiness sign-off.

## 1) Contract and runtime references

Use these files as the source of truth for runtime contract versions and behavior:

- Invoke gate contracts (`ActionIntentV1`, `GateDecisionV1`):
  - `apps/ui-tars/src/main/tools/invokeGate.ts`
- Deterministic tool call/result contracts (`v1` schemas):
  - `apps/ui-tars/src/main/tools/systemRunTool.ts`
  - `apps/ui-tars/src/main/tools/appLaunchTool.ts`
  - `apps/ui-tars/src/main/tools/windowFocusTool.ts`
  - `apps/ui-tars/src/main/tools/windowWaitReadyTool.ts`
- Recovery checkpoint contract (`CHECKPOINT_VERSION = v1`):
  - `apps/ui-tars/src/main/services/checkpointRecovery.ts`
- Runtime wiring and feature flag resolution:
  - `apps/ui-tars/src/main/services/runAgent.ts`
  - `apps/ui-tars/src/main/store/featureFlags.ts`

## 2) Reliability feature flags and rollback target set

The active closure flag set is:

- `ffToolRegistry`
- `ffInvokeGate`
- `ffToolFirstRouting`
- `ffConfidenceLayer`
- `ffLoopGuardrails`

Expected rollback behavior for closure evidence:

1. Disable the full flag set for a new session.
2. Verify runtime falls back to the legacy visual/operator path for actions that are no longer routed tool-first.
3. Record before/after behavior and exact settings in rollback evidence.

## 3) KPI evidence commands (canonical)

Generate report from raw runs:

```bash
node scripts/reliability/compute-kpi-report.mjs \
  --raw docs/reliability/artifacts/<timestamp>-raw-runs.ndjson \
  --out docs/reliability/artifacts/<timestamp>-report.json \
  --runId <run-id> \
  --repo Proven1902/UI-TARS-desktop \
  --runType gate \
  --minSampleCount 200 \
  --branch <branch> \
  --commit <commit-sha> \
  --provider <provider-name> \
  --model <model-name> \
  --appVersion <app-version>
```

Two-run gate check:

```bash
node scripts/reliability/check-kpi-gate.mjs \
  --first docs/reliability/artifacts/<run-a>.report.json \
  --second docs/reliability/artifacts/<run-b>.report.json
```

The gate is expected to fail if reports are not comparable, including:

- mismatched `environment.git.*`, `environment.model.*`, `environment.app.version`
- mismatched `environment.featureFlags.*`
- missing or duplicate `scope.runId`
- missing or duplicate `executionStatus.rawRunsPath` (resolved relative to each report file)

## 4) Final sign-off workflow

1. Capture two controlled runs on fixed environment per `docs/reliability/baseline-harness-runbook.md`.
2. Generate two KPI reports with canonical command and immutable provenance values.
3. Execute `check-kpi-gate.mjs` across both reports and keep JSON output.
4. Attach/refresh rollback rehearsal artifact for active flag set.
5. Update `docs/reliability/release-readiness-checklist.md` and mark only verified items.
6. Publish final approval note (template below) with links to PRs/commits/artifacts.

## 5) Approval note template

```md
## Reliability Migration Final Approval

- Base branch/commit: `<branch>` / `<commit>`
- Closure PRs:
  - `#20` (traceability + baseline scaffold)
  - `#21` (KPI automation + provenance parity + gate hardening)
  - `#<closure-pr-c>` (ops/sign-off docs)
- KPI evidence:
  - run A report: `docs/reliability/artifacts/<run-a>.report.json`
  - run B report: `docs/reliability/artifacts/<run-b>.report.json`
  - gate output: `<paste check-kpi-gate JSON>`
- Rollback evidence:
  - `docs/reliability/artifacts/<rollback-artifact>.md`
- Checklist:
  - `docs/reliability/release-readiness-checklist.md` all required items checked

Decision: `<APPROVED|BLOCKED>`
Reason: `<short reason>`
```
