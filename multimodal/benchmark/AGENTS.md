# AGENTS: multimodal/benchmark

## OVERVIEW
Benchmark workspace for evaluation pipelines and result artifacts, currently centered on content extraction benchmarking.

## WHERE TO LOOK
- Benchmark runner and scripts: `content-extraction/*`
- Extraction strategies and implementations: `content-extraction/src/*`
- Benchmark configs and datasets: `content-extraction/config*`, `content-extraction/data/*`
- Outputs and reports: `content-extraction/result/*`

## CONVENTIONS
- Treat benchmark outputs as generated artifacts; regenerate instead of hand-editing.
- Keep strategy logic isolated by strategy module; avoid cross-file side effects.
- Keep benchmark runs reproducible with explicit inputs/configs.

## ANTI-PATTERNS
- Do not treat `result/*` as source of truth for implementation logic.
- Do not mix production runtime code into benchmark-only utilities.
- Do not change benchmark assumptions without updating associated docs/configs.

## COMMANDS
```bash
cd multimodal/benchmark/content-extraction
pnpm install
pnpm test
pnpm build
```

## HANDOFF
- If benchmark strategy behavior changes, update strategy docs and expected outputs together.
- Keep notes on dataset/config assumptions near the benchmark entrypoint.
