# Snapshot

## Generate Snapshot

Generate snapshot for specified cases:

```bash
npx tsx snapshot/runner.ts generate tool-calls-basic
```

Generate snapshot for all casess:

```bash
npx tsx snapshot/runner.ts generate all
```

## Replay Snapshot

```bash
npx tsx snapshot/runner.ts replay default
```

Or using vitest:

```bash
npx vitest snapshot/index.test.ts
```
