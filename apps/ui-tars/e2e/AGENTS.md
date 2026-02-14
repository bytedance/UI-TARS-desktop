# AGENTS: apps/ui-tars/e2e

## OVERVIEW
Playwright end-to-end tests for packaged Electron app behavior and UI workflows.

## WHERE TO LOOK
- Primary e2e specs: `*.spec.ts`
- App launch/bootstrap helpers: `app.test.ts`, `teach-mode.spec.ts`
- Playwright runtime config: `../playwright.config.ts`

## CONVENTIONS
- Use Playwright test runner APIs (`test`, `expect`) with explicit setup/teardown.
- Keep e2e assertions user-visible and workflow-oriented.
- Reuse shared app-launch patterns (`findLatestBuild`, `parseElectronApp`) where present.
- Keep tests resilient to CI by following existing retry/trace behavior from Playwright config.

## SKILLS MEMORY
- Inherit skills baseline and invocation policy from `UI-TARS-desktop/AGENTS.md`.
- Lock source of truth: workspace `.agents/skills-lock.json` (outside this repo root).
- E2E reliability work should prefer: `playwright`, `e2e-testing-patterns`.
- Replacement mapping: `condition-based-waiting -> e2e-testing-patterns`.

## ANTI-PATTERNS
- Do not depend on local-only machine state that CI cannot reproduce.
- Do not mix unit-level implementation assertions into e2e specs.
- Do not introduce flaky timing assumptions; prefer deterministic waits/assertions.
- Do not bypass existing build/bootstrap flow for packaged app runs.

## COMMANDS
```bash
cd apps/ui-tars
pnpm run build:e2e
pnpm run test:e2e
pnpm run test:e2e -- e2e/teach-mode.spec.ts
pnpm run test:e2e -- -g "teach"
```

## HANDOFF
- If adding new e2e flows, keep spec names and intent clear and update docs/comments for special prerequisites.
- When changing startup/build mechanics, update both e2e specs and `playwright.config.ts` expectations together.
