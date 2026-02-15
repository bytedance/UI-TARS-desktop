# Setup Task-Fit Map (MCP/LSP/AST/Plugins)

This map binds setup recommendations to plan tasks without implementing business features.

| Plan Task | MCP | LSP | AST Tools | Plugins |
|---|---|---|---|---|
| Task 0 - Baseline Contract + Scope Lock | Define MCP trust posture and denylist policy in setup lock | Enforce CLI-first fallback and LSP probe scripts | Establish minimal AST policy (`ast-grep`, `jscodeshift`, `jsonc-parser`) | Lock mandatory/optional/denylist plugin policy |
| Task 1 - runAgent hardening | Conformance tooling ready for policy-facing tests later | TS CLI fallback typecheck for deterministic checks | Structural search and safe codemod baseline for refactors | `security-guidance` for static risk prompts |
| Task 2 - Preload boundary hardening | Policy docs constrain privileged surfaces | TS + JSON + YAML + Markdown fallback commands documented | `ast-grep` rules for bridge anti-pattern checks | None required |
| Task 3 - E2E reliability hardening | None required | CLI fallback ensures test setup stays deterministic | AST stack optional for targeted test harness edits | `opencode-shell-strategy` and notifier improve execution ergonomics |
| Task 4 - Docs drift alignment | MCP/plugin policy documentation sync | LSP fallback docs in AGENTS and setup docs | AST docs policy synced in AGENTS | Plugin policy reflected in docs only |
| Task 5 - ExecPolicy contracts + dry-run engine | MCP SDK + inspector + conformance provide trusted policy tooling baseline | TS fallback supports deterministic policy tests | AST tools can enforce no unsafe rewrites in policy code | `security-guidance` assists threat review |
| Task 6 - Approval store + audit trail | MCP trust model aligns audit metadata and decision classes | TS/JSON fallback checks for metadata payload integrity | `jsonc-parser` for minimal config metadata updates | None required |
| Task 7 - Pilot enforcement wiring | MCP governance layer remains allowlist-first and rollback-friendly | LSP probe/fallback commands ensure environment readiness | `ast-grep` supports scope leakage pattern checks | None required |
| Task 8 - Kill switch and rollback rehearsal | MCP gateway/governance choices map to rapid disable strategy | CLI fallbacks avoid LSP runtime dependency during rollback drills | AST optional for safe guardrail checks | None required |
| Task 9 - Final gate matrix and closure | Conformance/Inspector artifacts can be part of closure evidence | Probe + fallback checks included in preflight evidence | AST baseline validation included in setup checks | Plugin lock reviewed for scope drift |

## Trusted-only guardrails

- Default deny: only official docs/specs and maintained repos are valid trust roots.
- Directory/marketplace entries are discovery only; never runtime source-of-truth.
- All executable tools must be pinned and verified by lock/source-of-truth files.
- If any recommended item is missing/untrusted, create custom spec instead of improvising runtime setup.
