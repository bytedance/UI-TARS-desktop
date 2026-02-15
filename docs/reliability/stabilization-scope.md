# Stabilization Scope Lock

Task: 0 (Baseline Contract + Scope Lock)
Plan: `../.sisyphus/plans/ui-tars-next-vector-hybrid-stabilization-exec-host.md`

IN:
- Runtime stabilization for `runAgent` orchestration paths.
- Preload boundary hardening with typed and restricted bridge surface.
- E2E harness determinism improvements for app boot and teach mode.
- Documentation drift alignment for stabilization baseline.
- One narrow `exec-host` policy pilot using dry-run-first enforcement and explicit rollback controls.

OUT:
- Net-new product feature work unrelated to stabilization and `exec-host` pilot scope.
- Broad OpenClaw parity import or generalized policy platform work.
- Production-wide enforcement without scoped pilot evidence.
- Manual-only acceptance paths without machine-checkable evidence artifacts.

Pilot allowlist:
- host
- security
- ask

Rollback scope: new_sessions_only
out_of_scope_denies=0
unexpected_in_scope_deny_budget=1
