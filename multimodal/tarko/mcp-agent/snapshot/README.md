# Snapshot

## Generate Snapshot

Generate snapshot for specified cases:

```bash
npx tsx snapshot/runner.ts generate github-reviewer-agent/volcengine
```

Generate snapshot for all casess:

```bash
npx tsx snapshot/runner.ts generate all
```

## Replay Snapshot

```bash
npx tsx snapshot/runner.ts replay github-reviewer-agent/volcengine
```

Or using vitest:

```bash
npx vitest snapshot/index.test.ts
```
