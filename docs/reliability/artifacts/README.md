# Reliability Artifacts Guide

This directory stores baseline/KPI and rollback evidence artifacts.

Raw runs input supports two formats:

- NDJSON (one JSON object per line)
- JSON array (array of run-row objects)

## Canonical scenario IDs

Use these IDs consistently in raw runs (`scenarioId`):

- `open_cursor`
- `open_settings`
- `focus_existing_browser_window`
- `recover_from_intentional_timeout`

Each raw run row must include consistent row-level provenance:

- `environment.git.repo`
- `environment.git.branch`
- `environment.git.commit`
- `environment.model.provider`
- `environment.model.name`
- `environment.app.version`

Each raw run row must also include these reliability flags (boolean) and keep them consistent across the full batch:

- `featureFlags.ffToolRegistry`
- `featureFlags.ffInvokeGate`
- `featureFlags.ffToolFirstRouting`
- `featureFlags.ffConfidenceLayer`
- `featureFlags.ffLoopGuardrails`

## Generate KPI report from raw runs

## Collect raw runs (deterministic harness)

```bash
node scripts/reliability/collect-kpi-raw-runs.mjs \
  --out docs/reliability/artifacts/<timestamp>-raw-runs.ndjson \
  --runId <run-id> \
  --sampleCount 200 \
  --openCursorCount 1 \
  --openSettingsCount 39 \
  --focusBrowserCount 120 \
  --recoverTimeoutCount 40 \
  --repo <owner/repo> \
  --branch main \
  --commit <commit-sha> \
  --provider <provider-name> \
  --model <model-name> \
  --appVersion <app-version>
```

This harness emits command-level run rows with fixed provenance and reliability flags.
Probe semantics are fail-closed:

- `open_cursor` fails when Cursor is missing or launch fails
- `open_settings` fails when `Start-Process ms-settings:` errors
- `focus_existing_browser_window` fails when no target browser window is activated

## Generate KPI report from raw runs

```bash
node scripts/reliability/compute-kpi-report.mjs \
  --raw docs/reliability/artifacts/<timestamp>-raw-runs.ndjson \
  --out docs/reliability/artifacts/<timestamp>-report.json \
  --runId <run-id> \
  --repo <owner/repo> \
  --runType gate \
  --minSampleCount 200 \
  --branch main \
  --commit <commit-sha> \
  --provider <provider-name> \
  --model <model-name> \
  --appVersion <app-version>
```

`compute-kpi-report` stores `executionStatus.rawRunsPath` relative to the generated report file.

## Check two-run KPI gate

```bash
node scripts/reliability/check-kpi-gate.mjs \
  --first docs/reliability/artifacts/<run-1>.report.json \
  --second docs/reliability/artifacts/<run-2>.report.json
```

Exit code `0` means both reports passed and the gate is green.

The gate checker rejects:

- duplicated `--first/--second` report path
- duplicated `scope.runId` values
- duplicated `executionStatus.rawRunsPath` values (including equivalent paths after resolving each one relative to its report file)
- mismatched build/model provenance fields across reports (`environment.git.*`, `environment.model.*`, `environment.app.version`)
- mismatched reliability feature flags across reports (`environment.featureFlags.ffToolRegistry`, `ffInvokeGate`, `ffToolFirstRouting`, `ffConfidenceLayer`, `ffLoopGuardrails`)
- reports without full coverage pass

`minSampleCount` is clamped to at least `200` (runbook minimum), even if a lower value is passed.

## Current measured evidence (2026-02-13)

- Baseline run:
  - `2026-02-13-baseline-run-002.raw-runs.ndjson`
  - `2026-02-13-baseline-run-002.report.json`
  - `2026-02-13-baseline-run-002.summary.md`
- Consecutive gate runs:
  - `2026-02-13-gate-run-003.raw-runs.ndjson`
  - `2026-02-13-gate-run-003.report.json`
  - `2026-02-13-gate-run-004.raw-runs.ndjson`
  - `2026-02-13-gate-run-004.report.json`
  - `2026-02-13-gate-run-003-004.gate.json`
  - `2026-02-13-gate-run-003-004.summary.md`
- Rollback and regression evidence:
  - `2026-02-13-rollback-rehearsal-002.md`
  - `2026-02-13-phase-regression-evidence.md`
  - `2026-02-13-final-approval-note.md`
