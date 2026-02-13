# UI-TARS Reliability Migration Traceability Matrix

Last updated: 2026-02-13
Source requirements reference: `docs/reliability/plan-closure-backlog.md`
Target repo: `https://github.com/Proven1902/UI-TARS-desktop`

## Numbering drift note

Plan PR IDs and GitHub PR numbers are different namespaces.

- Plan `PR-06a` consumed one GitHub PR slot.
- Plan `PR-13a` consumed one additional GitHub PR slot.
- Resulting offsets:
  - Around plan `PR-10..PR-13`, GitHub offset is `+1`.
  - Around plan `PR-14..PR-17`, GitHub offset is `+2`.

## Plan slice matrix (PR-00 .. PR-17)

| Plan slice | GitHub PR | Merge commit | Status | Evidence (code/tests) |
|---|---|---|---|---|
| PR-00 baseline KPI harness + report artifact | N/A | N/A | In progress (scaffolded) | Harness/docs scaffolding exists: `docs/reliability/baseline-harness-runbook.md`, `docs/reliability/artifacts/reliability-kpi-report.template.json`, `docs/reliability/artifacts/2026-02-13-baseline-run-001.*`; execution evidence still pending |
| PR-01 P0 local operator correctness | #4 | `ff463306` | Implemented | `apps/ui-tars/src/main/agent/operator.ts`, `apps/ui-tars/src/main/agent/operator.test.ts` |
| PR-02 P0 renderer permission gate fix | #4 | `ff463306` | Implemented | `apps/ui-tars/src/renderer/src/hooks/useRunAgent.ts` |
| PR-03 P0 remote invalid-coordinate fail-fast | #4 | `ff463306` | Implemented | `apps/ui-tars/src/main/remote/operators.ts`, `apps/ui-tars/src/main/remote/operators.test.ts` |
| PR-04 P0 model/parser non-actionable guard | #4 (+ #3 parser hardening) | `ff463306` (+ `7adfb9cf`) | Implemented | `packages/ui-tars/sdk/src/GUIAgent.ts`, `packages/ui-tars/action-parser/src/actionParser.ts`, tests in `packages/ui-tars/sdk/tests/GUIAgent.test.ts`, `packages/ui-tars/action-parser/test/actionParser.test.ts` |
| PR-05 P1 tool registry skeleton + flags | #5 | `63d677b8` | Implemented | `apps/ui-tars/src/main/tools/toolRegistry.ts`, `apps/ui-tars/src/main/store/featureFlags.ts`, tests `toolRegistry.test.ts`, `featureFlags.test.ts`, `validate.test.ts` |
| PR-06 P1 invoke gate + schema + deny reasons | #6 | `417743cc` | Implemented | `apps/ui-tars/src/main/tools/invokeGate.ts`, `apps/ui-tars/src/main/tools/invokeGateOperator.ts`, tests `invokeGate.test.ts`, `invokeGateOperator.test.ts` |
| PR-06a deny-reason catalog + contract tests | #7 | `2da62237` | Implemented | `apps/ui-tars/src/main/tools/invokeGateReasons.ts`, `apps/ui-tars/src/main/tools/invokeGateReasons.test.ts` |
| PR-07 P1 system.run(argv) adapter | #8 | `3e1cc4e6` | Implemented | `apps/ui-tars/src/main/tools/systemRunTool.ts`, `apps/ui-tars/src/main/tools/systemRunTool.test.ts` |
| PR-08 P1 app.launch tool | #9 | `8ac5111f` | Implemented | `apps/ui-tars/src/main/tools/appLaunchTool.ts`, `apps/ui-tars/src/main/tools/appLaunchTool.test.ts` |
| PR-09 P1 window.focus + window.wait_ready | #10 | `6ca1ce32` | Implemented | `apps/ui-tars/src/main/tools/windowFocusTool.ts`, `apps/ui-tars/src/main/tools/windowWaitReadyTool.ts` and tests |
| PR-10 P1 routing policy (tool-first then visual fallback) | #11 | `da5889ff` | Implemented | `apps/ui-tars/src/main/tools/toolFirstRouter.ts`, `apps/ui-tars/src/main/tools/invokeGateOperator.ts`, tests `toolFirstRouter.test.ts`, `invokeGateOperator.test.ts` |
| PR-10a kill-switch wiring + routing fallback verification | Embedded in #5/#11 | `63d677b8` + `da5889ff` | Implemented (embedded) | Kill-switches in `apps/ui-tars/src/main/store/featureFlags.ts` and runtime gating in `apps/ui-tars/src/main/services/runAgent.ts`; fallback verified in `toolFirstRouter.test.ts` |
| PR-11 P2 error taxonomy + mapping | #12 | `c820ccf3` | Implemented | `apps/ui-tars/src/main/tools/errorTaxonomy.ts`, `apps/ui-tars/src/main/services/runAgent.ts`, `errorTaxonomy.test.ts` |
| PR-12 P2 bounded retry engine + tests | #13 | `ebb71c22` | Implemented | `packages/ui-tars/sdk/src/retryEngine.ts`, `packages/ui-tars/sdk/tests/retryEngine.test.ts`, GUIAgent integration in `packages/ui-tars/sdk/src/GUIAgent.ts` |
| PR-13 P2 checkpoint/recovery + resume invariants | #14 | `4f748327` | Implemented | `apps/ui-tars/src/main/services/checkpointRecovery.ts`, `apps/ui-tars/src/main/ipcRoutes/agent.ts`, `checkpointRecovery.test.ts` |
| PR-13a forced-crash resume integration test | #15 | `9804ba90` | Implemented | `apps/ui-tars/src/main/ipcRoutes/agent.test.ts` |
| PR-14 P2 OAuth cooldown/reauth improvements | #16 | `434c3ba6` | Implemented | `apps/ui-tars/src/main/services/codexAuth.ts`, `apps/ui-tars/src/main/services/codexAuthCooldown.ts`, `codexAuthCooldown.test.ts`, renderer settings `vlm.tsx` |
| PR-15 P3 identity confidence + safe downgrade | #17 | `fcbfc00b` | Implemented | `apps/ui-tars/src/main/tools/toolFirstTarget.ts`, confidence gating in `apps/ui-tars/src/main/tools/invokeGate.ts`, tests `toolFirstTarget.test.ts`, `invokeGate.test.ts` |
| PR-16 P3 loop guardrails + anti-repeat | #18 | `22858dea` | Implemented | `apps/ui-tars/src/main/tools/invokeGateOperator.ts`, `apps/ui-tars/src/main/tools/invokeGate.ts`, tests `invokeGateOperator.test.ts`, `invokeGate.test.ts` |
| PR-17 P3 observability dashboards + release gates | #19 | `e0d75379` | Implemented (backend service + IPC) | `apps/ui-tars/src/main/services/reliabilityObservability.ts`, `apps/ui-tars/src/main/ipcRoutes/agent.ts`, tests `reliabilityObservability.test.ts`, `agent.test.ts` |

## DoD/evidence status (post-PR-19)

- Implemented code slices: P0/P1/P2/P3 are functionally present.
- Missing completion evidence from plan:
  - Baseline KPI execution evidence (`PR-00` scaffolding exists, measured results pending).
  - KPI gate evidence for two consecutive runs.
  - Explicit rollback rehearsal artifacts for phase/global DoD.
  - Dedicated ops/docs update package for final sign-off.
