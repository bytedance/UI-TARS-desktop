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

## 6) Latest measured evidence snapshot (2026-02-13)

- baseline report: `docs/reliability/artifacts/2026-02-13-baseline-run-002.report.json`
- gate reports:
  - `docs/reliability/artifacts/2026-02-13-gate-run-003.report.json`
  - `docs/reliability/artifacts/2026-02-13-gate-run-004.report.json`
- two-run gate output: `docs/reliability/artifacts/2026-02-13-gate-run-003-004.gate.json`
- summaries:
  - `docs/reliability/artifacts/2026-02-13-baseline-run-002.summary.md`
  - `docs/reliability/artifacts/2026-02-13-gate-run-003-004.summary.md`
- rollback rehearsal:
  - `docs/reliability/artifacts/2026-02-13-rollback-rehearsal-002.md`
- phase regression evidence:
  - `docs/reliability/artifacts/2026-02-13-phase-regression-evidence.md`
- final approval note:
  - `docs/reliability/artifacts/2026-02-13-final-approval-note.md`

## 7) MCP external governance state (docker-only baseline)

Current operating mode is docker-only. Repo-level MCP closure is allowed when Docker MCP Gateway is closed and cloud targets are explicitly marked deferred with rationale in `docs/reliability/setup/tooling-setup-lock.json`.

- Azure API Management for MCP
  - required fields: `subscriptionId`, `resourceGroup`, `serviceName`, `gatewayEndpoint`, `policyPin`
  - state: deferred (no active Azure subscription)
  - close condition (full-cloud mode): gateway live and all fields pinned in lock file
- Docker MCP Gateway
  - required fields: `imageRef`, `containerDigest`, `listenEndpoint`, `networkPolicyPin`
  - state: closed (local)
  - close condition: immutable image digest + endpoint pinned in lock file and SSE endpoint smoke test passes
- Microsoft MCP Gateway
  - required fields: `gatewayId`, `endpoint`, `authProfilePin`
  - state: deferred (no active Azure subscription)
  - close condition (full-cloud mode): managed gateway provisioned and fields pinned in lock file

Evidence to attach when closing each item:

- command transcript or deployment output proving provision success
- exact immutable identifiers (IDs, digests, policy/auth pins)
- updated lock file diff showing placeholders replaced with concrete values

## 8) Plugin runtime closure evidence (OpenCode + Claude)

- OpenCode runtime (user scope)
  - config path: `~/.config/opencode/opencode.json`
  - verify load: `opencode debug config`
  - required applied entries:
    - `oh-my-opencode@3.5.3`
    - `file:///home/<user>/.config/opencode/plugins/opencode-worktree/src/plugin/worktree.ts`
    - `@mohak34/opencode-notifier@0.1.19`
    - `~/.config/opencode/plugins/shell-strategy/shell_strategy.md` in `instructions`

- Claude plugin runtime (user scope)
  - marketplace: `claude-plugins-official`
  - verify marketplace: `claude plugin marketplace list`
  - verify plugins: `claude plugin list`
  - required applied entries:
    - `commit-commands@claude-plugins-official` (version `2cd88e7947b7`)
    - `security-guidance@claude-plugins-official` (version `2cd88e7947b7`)

## 9) MCP external governance closure procedure (Windows)

Use this when replacing placeholders in `docs/reliability/setup/tooling-setup-lock.json`.

- Prerequisites checks:
  - `az --version`
  - `docker --version`
  - `kubectl version --client`
- Azure sign-in/context:
  - `Connect-AzAccount`
  - `Get-AzSubscription`
  - `Select-AzSubscription -SubscriptionId "<subscriptionId>"`

Field collection commands (copy/paste):

- Azure APIM (`subscriptionId`, `resourceGroup`, `serviceName`, `gatewayEndpoint`, `policyPin`)
  - `(Get-AzContext).Subscription.Id`
  - `$apim = Get-AzApiManagement -Name "<serviceName>" -ResourceGroupName "<resourceGroup>"`
  - `$apim.RuntimeUrl`
  - `$ctx = New-AzApiManagementContext -ResourceGroupName "<resourceGroup>" -ServiceName "<serviceName>"`
  - `Get-AzApiManagementPolicy -Context $ctx -Format rawxml -SaveAs ".\policy.xml"`
  - `Get-FileHash .\policy.xml -Algorithm SHA256`
- Docker MCP Gateway (`imageRef`, `containerDigest`, `listenEndpoint`, `networkPolicyPin`)
  - `docker pull docker/mcp-gateway:v2`
  - `docker image inspect docker/mcp-gateway:v2 --format '{{index .RepoDigests 0}}'`
  - `docker run -d --name mcp-gateway -p 8811:8811 -v /var/run/docker.sock:/var/run/docker.sock docker/mcp-gateway:v2 --transport=sse --port=8811 --servers=duckduckgo`
  - `Test-NetConnection -ComputerName localhost -Port 8811`
  - `curl.exe --max-time 10 http://localhost:8811/sse`
  - `docker network inspect bridge --format '{{.Id}}'`
- Microsoft MCP Gateway (`gatewayId`, `endpoint`, `authProfilePin`)
  - `$appGw = Get-AzApplicationGateway -Name "<gatewayName>" -ResourceGroupName "<resourceGroup>"`
  - `$appGw.Id`
  - `$pip = Get-AzPublicIpAddress -Name "<publicIpName>" -ResourceGroupName "<resourceGroup>"`
  - `$pip.DnsSettings.Fqdn`
  - `Get-AzADApplication -ApplicationId "<clientId>"`

Required smoke tests before setting status to closed (docker-only mode):

- Docker: `docker ps --filter "ancestor=docker/mcp-gateway:v2"` and `curl.exe --max-time 10 http://localhost:8811/sse`

Required smoke tests before setting status to closed (full-cloud mode):

- APIM: `az apim show -g <resourceGroup> -n <serviceName> --query "provisioningState"`
- Docker: `docker ps --filter "ancestor=docker/mcp-gateway:v2"` and `curl.exe --max-time 10 http://localhost:8811/sse`
- Microsoft: `kubectl get pods -n adapter` and `Invoke-RestMethod -Uri "http://<endpoint>/adapters"`

For docker-only mode, mark `status` as `closed-docker-only` when Docker target is concrete and cloud targets are explicitly `deferred` with rationale. For full-cloud mode, mark `status` as `closed` only when all 12 fields are concrete and all smoke tests pass.
