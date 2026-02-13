# UI-TARS Migration Plan Closure Backlog

Last updated: 2026-02-13 (post-PR-21 merge)
Related matrix: `docs/reliability/migration-traceability-matrix.md`

## Goal

Close all remaining non-code evidence gaps so the migration plan can be marked complete, not only implemented.

## Remaining work (priority order)

1. **Baseline KPI harness + report artifact (PR-00 equivalent)**
   - Progress: runbook + artifact skeleton + strict generator validation landed; real fixed-environment execution evidence still pending.
   - Add a reproducible harness definition for the fixed environment/task set in plan section 3.1.
   - Emit baseline report artifact with required metrics:
     - open-app first-attempt success
     - wrong-click rate
     - max-loop termination rate
     - auth hard-failure rate
   - Store artifact in-repo (or tracked artifact path with checksum and retrieval instructions).

2. **KPI gate evidence (two consecutive runs)**
   - Progress: KPI report generation and gate-check scripts merged in `#21`; real two-run artifacts still pending.
   - Run controlled measurement twice.
   - Record per-run raw data + aggregate summary against targets:
     - wrong-click rate < 1%
     - open-app first-attempt success >= 95%
   - Attach exact run commands/configs and timestamps.

3. **Rollback rehearsal evidence for phase/global DoD**
   - Progress: first test-level rollback rehearsal artifact added (`2026-02-13-baseline-run-001.rollback.md`); full flag-set rehearsal package still pending.
   - Execute explicit rollback rehearsal for currently used reliability flags:
     - `ffToolRegistry`, `ffInvokeGate`, `ffToolFirstRouting`, `ffConfidenceLayer`, `ffLoopGuardrails`
   - Prove fallback behavior for new sessions when flags are disabled.
   - Capture before/after expected behavior in concise test logs.

4. **Final documentation pack (operations + contracts + flags)**
   - Progress: in progress (ops/sign-off runbook added in Closure-PR-C draft).
   - Add operator-facing doc describing:
      - contract versions (`ActionIntentV1`, `GateDecisionV1`, tool call/result contracts, checkpoint)
      - release gate semantics
      - rollback playbook
   - Add concise "how to verify release readiness" checklist.

## Suggested final slicing

- **Closure-PR-A**: baseline harness + first baseline report artifact.
  - Status: merged as `#20`.
- **Closure-PR-B**: KPI two-run evidence + rollback rehearsal logs.
  - Status: merged as `#21` (automation and gate hardening complete; real two-run evidence still pending).
- **Closure-PR-C**: final docs/ops package + readiness checklist.
  - Status: in progress (current branch).

## Notes

- Plan IDs and GitHub PR numbers drift (because of `06a` and `13a` slices). Keep plan IDs as source-of-truth labels in closure docs.
- Current observability implementation exists and is session-scoped, but dashboard/release-gate APIs are still mostly consumed by tests; production validation artifacts are still required for formal completion.
