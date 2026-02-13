# Phase Regression Evidence

- Date: 2026-02-13
- Commit under validation: `ce12f9571e24315ed0f349be75997525fab85857`

## Commands

```bash
cd apps/ui-tars
pnpm vitest run src/main/agent/operator.test.ts src/main/remote/operators.test.ts src/main/tools/toolRegistry.test.ts src/main/tools/invokeGate.test.ts src/main/tools/invokeGateReasons.test.ts src/main/tools/systemRunTool.test.ts src/main/tools/appLaunchTool.test.ts src/main/tools/windowFocusTool.test.ts src/main/tools/windowWaitReadyTool.test.ts src/main/tools/toolFirstRouter.test.ts src/main/tools/toolFirstTarget.test.ts src/main/tools/errorTaxonomy.test.ts src/main/services/checkpointRecovery.test.ts src/main/services/codexAuthCooldown.test.ts src/main/services/reliabilityObservability.test.ts src/main/ipcRoutes/agent.test.ts --reporter=verbose

cd packages/ui-tars/sdk
pnpm vitest run tests/retryEngine.test.ts tests/GUIAgent.test.ts --environment node --reporter=verbose

cd packages/ui-tars/action-parser
pnpm vitest run test/actionParser.test.ts --reporter=verbose
```

## Results

- Main-process reliability suite: `16 files passed`, `100 tests passed`.
- SDK reliability suite: `2 files passed`, `9 tests passed`.
- Action parser guardrail suite: `1 file passed`, `38 tests passed`.

## Phase mapping

- P0 evidence: `operator.test.ts`, `operators.test.ts`, `actionParser.test.ts`, `GUIAgent.test.ts`.
- P1 evidence: tool registry/invoke gate/deterministic tool/router tests in `src/main/tools/*.test.ts`.
- P2 evidence: `errorTaxonomy.test.ts`, `checkpointRecovery.test.ts`, `codexAuthCooldown.test.ts`, `retryEngine.test.ts`, recovery checks in `ipcRoutes/agent.test.ts`.
- P3 evidence: `toolFirstTarget.test.ts`, `invokeGateOperator.test.ts`, `reliabilityObservability.test.ts`.

Raw command outputs were captured during execution and summarized above.
