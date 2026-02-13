# Baseline Harness Runbook

This runbook defines the baseline/KPI measurement protocol for the reliability migration plan.

Plan reference: `.sisyphus/plans/ui-tars-computer-use-openclaw-migration.md` (section 3.1 and section 11).

## 1. Fixed environment

- Platform: Windows desktop runner.
- Displays: run both single-monitor and multi-monitor samples.
- Build: record exact git commit, branch, app version, and model/provider config.
- Feature flags: record all reliability flags for each run:
  - `ffToolRegistry`
  - `ffInvokeGate`
  - `ffToolFirstRouting`
  - `ffConfidenceLayer`
  - `ffLoopGuardrails`

## 2. Scenario pack

Run each scenario with deterministic setup and consistent prompts.

- `open Cursor`
- `open Settings`
- `focus existing browser window`
- `recover from intentional timeout`

For baseline and KPI gates, target total volume of 200 runs across the scenario pack.

## 3. Required metrics

Collect and report these metrics per run set:

- open-app first-attempt success rate
- wrong-click rate
- max-loop termination rate
- auth hard-failure rate

## 4. Data capture protocol

For every run, persist at minimum:

- `runId`, timestamp, scenario name
- session id
- final status (`completed`, `blocked`, `error`, etc.)
- first-attempt success boolean for open-app scenarios
- wrong-click boolean/count
- max-loop termination boolean
- auth hard-failure boolean
- active feature flags and provider/model settings

Store artifacts in `docs/reliability/artifacts/` using timestamped file names.

## 5. Output artifacts

For each measurement batch produce:

1. Raw runs file (JSON or NDJSON)
2. Aggregated report JSON (see template file)
3. Short markdown summary with conclusions and known caveats

## 6. Acceptance thresholds

Use these plan thresholds for readiness evaluation:

- wrong-click rate < 1%
- open-app first-attempt success >= 95%
- two consecutive runs meeting targets

## 7. Rollback rehearsal linkage

Each KPI run should state whether rollback rehearsal has been executed for the same build/flags and link to evidence.
