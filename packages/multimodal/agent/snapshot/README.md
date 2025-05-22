# Snapshot

## Generate Snapshot

Usage:

```bash
npx tsx snapshot/runner.ts

Usage: index.ts [generate|test] [case-name]
Available cases:
- tool-calls-basic
- tool-calls-prompt-engineering
- streaming-tool-calls
- streaming-tool-calls-prompt-engineering
```

Generate snapshot for specified cases:

```bash
npx tsx snapshot/runner.ts generate tool-calls-basic
```


Generate snapshot for all casess:

```bash
npx tsx snapshot/runner.ts generate all
```

## Test Snapshot

```bash
npx tsx snapshot/runner.ts test gui-agent/basic
```

Or using vitest:

```bash
npx vitest snapshot/index.test.ts
```

