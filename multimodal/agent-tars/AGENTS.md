# AGENTS: multimodal/agent-tars

## OVERVIEW
Agent TARS product line with `core`, `interface`, and `cli` packages for multimodal agent execution and environment abstractions.

## WHERE TO LOOK
- Core runtime/envs/tools: `core/src/*`, tests in `core/tests/*`
- CLI entry + command surface: `cli/src/*`
- Interface package contracts: `interface/src/*`

## CONVENTIONS
- Environment abstractions live under `core/src/environments/*`; keep new env/tool code there.
- Keep CLI thin: parse/config/bootstrap, delegate runtime to core.
- Use shared resolver/config utilities already present in `core/src/shared/*`.

## ANTI-PATTERNS
- Do not entangle interface and runtime internals.
- Do not add environment-specific hacks outside environment modules.
- Do not bypass existing validation/parse helpers for tool actions.

## COMMANDS
```bash
cd multimodal/agent-tars
pnpm -r test
pnpm -r build
```

## HANDOFF
- If changes touch browser/filesystem environment abstractions, update core environment docs and tests together.
- Keep CLI-facing behavior and core runtime behavior documented separately.
