# AGENTS: multimodal

## OVERVIEW
Nested workspace for Agent TARS ecosystem (agent cores, GUI stacks, omni variants, websites, benchmarks). Treat this folder as a semi-independent monorepo.

## WHERE TO LOOK
- Agent TARS stack: `agent-tars/*`
- GUI Agent stack: `gui-agent/*`
- Omni TARS stack: `omni-tars/*`
- Tarko stack: `tarko/*`
- Benchmark tooling/results: `benchmark/*`
- Website/docs packages: `websites/*`

## CONVENTIONS
- Use multimodal-local workspace configs (`multimodal/pnpm-workspace.yaml`, `.prettierrc.yml`, `.editorconfig`).
- Run commands from `multimodal/` when working in this subtree.
- Keep package-level tests/configs in each subproject.

## ANTI-PATTERNS
- Do not mix root workspace assumptions with multimodal workspace commands.
- Do not treat benchmark output directories as source modules.
- Do not duplicate shared utilities across tars variants when shared packages already exist.

## COMMANDS
```bash
cd multimodal
pnpm bootstrap
pnpm test
pnpm build
```

## HANDOFF
When introducing shared behavior, update the most specific subproject AGENTS file (`benchmark`, `websites`, `tarko`, `agent-tars`, `gui-agent`, `omni-tars`) instead of only this parent file.
