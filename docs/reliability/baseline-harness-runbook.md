# Baseline Harness Runbook

This runbook defines the baseline/KPI measurement protocol for the reliability migration plan.

References:

- `docs/reliability/plan-closure-backlog.md`
- `docs/reliability/migration-traceability-matrix.md`

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

- `open_cursor` (open Cursor)
- `open_settings` (open Settings)
- `focus_existing_browser_window`
- `recover_from_intentional_timeout`

For baseline and KPI gates, target total volume of 200 runs across the scenario pack.

## 3. Required metrics

Collect and report these metrics per run set:

- open-app first-attempt success rate
- wrong-click rate
- max-loop termination rate
- auth hard-failure rate

## 4. Data capture protocol

For every run, persist at minimum:

- `runId`, timestamp, `scenarioId` (must use canonical IDs from section 2)
- session id
- final status (`completed`, `blocked`, `error`, etc.)
- first-attempt success boolean for open-app scenarios
- wrong-click boolean/count
- max-loop termination boolean
- auth hard-failure boolean
- row-level provenance fields (required on every row and must be consistent across batch):
  - `environment.git.repo`
  - `environment.git.branch`
  - `environment.git.commit`
  - `environment.model.provider`
  - `environment.model.name`
  - `environment.app.version`
- active feature flags (required on every row and must be consistent across batch):
  - `featureFlags.ffToolRegistry`
  - `featureFlags.ffInvokeGate`
  - `featureFlags.ffToolFirstRouting`
  - `featureFlags.ffConfidenceLayer`
  - `featureFlags.ffLoopGuardrails`
- provider/model settings

Store artifacts in `docs/reliability/artifacts/` using timestamped file names.

## 5. Output artifacts

For each measurement batch produce:

1. Raw runs file (NDJSON or JSON array)
2. Aggregated report JSON (see template file)
3. Short markdown summary with conclusions and known caveats

### KPI automation commands

```bash
node scripts/reliability/collect-kpi-raw-runs.mjs \
  --out docs/reliability/artifacts/<timestamp>-raw-runs.ndjson \
  --runId <run-id> \
  --sampleCount 200 \
  --openCursorCount 1 \
  --openSettingsCount 39 \
  --focusBrowserCount 120 \
  --recoverTimeoutCount 40 \
  --repo Proven1902/UI-TARS-desktop \
  --branch main \
  --commit <commit-sha> \
  --provider harness-powershell \
  --model deterministic-tool-probes \
  --appVersion 0.2.4
```

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

`compute-kpi-report` writes `executionStatus.rawRunsPath` relative to the report location.

```bash
node scripts/reliability/check-kpi-gate.mjs \
  --first docs/reliability/artifacts/<run-1>.report.json \
  --second docs/reliability/artifacts/<run-2>.report.json
```

The report must fail coverage when either condition is not met:

- sample count is below target (`200` by default)
- one or more canonical scenarios are missing from the batch

The generator enforces a hard minimum of `200` runs for coverage (`--minSampleCount` cannot lower this floor).

The two-run gate check must also fail if provenance metadata differs between reports:

- `environment.git.repo`
- `environment.git.branch`
- `environment.git.commit`
- `environment.model.provider`
- `environment.model.name`
- `environment.app.version`

The two-run gate check must also fail when:

- `environment.featureFlags` values differ between reports (`ffToolRegistry`, `ffInvokeGate`, `ffToolFirstRouting`, `ffConfidenceLayer`, `ffLoopGuardrails`)
- `executionStatus.rawRunsPath` is missing on either report
- both reports reference the same raw-runs evidence path (including equivalent paths after resolving each one relative to its report file)

## 6. Acceptance thresholds

Use these plan thresholds for readiness evaluation:

- wrong-click rate < 1%
- open-app first-attempt success >= 95%
- two consecutive runs meeting targets

## 7. Rollback rehearsal linkage

Each KPI run should state whether rollback rehearsal has been executed for the same build/flags and link to evidence.
