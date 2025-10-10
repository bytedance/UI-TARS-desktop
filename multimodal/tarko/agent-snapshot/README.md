# @tarko/agent-snapshot

A snapshot-based testing framework for `@tarko/agent` based Agents. This package provides deterministic testing capabilities by capturing and replaying agent interactions, including LLM requests/responses, tool calls, and event streams.

## Features

- **Snapshot Generation**: Capture real agent interactions for test fixtures
- **Deterministic Replay**: Mock LLM responses using captured snapshots
- **Comprehensive Verification**: Validate LLM requests, event streams, and tool calls
- **Flexible Configuration**: Customize normalization and verification settings
- **CLI Support**: Command-line tools for snapshot management

## Installation

```bash
npm install @tarko/agent-snapshot
```

## Quick Start

### Basic Usage

```typescript
import { Agent } from '@tarko/agent';
import { AgentSnapshot } from '@tarko/agent-snapshot';

// Create your agent
const agent = new Agent(/* your config */);

// Create snapshot instance
const snapshot = new AgentSnapshot(agent, {
  snapshotPath: './fixtures/my-test-case',
  snapshotName: 'example-test'
});

// Generate snapshot (runs with real LLM)
await snapshot.generate("Hello, how can you help me?");

// Replay test (uses mocked responses)
const result = await snapshot.replay("Hello, how can you help me?");
```

### Advanced Configuration

```typescript
const snapshot = new AgentSnapshot(agent, {
  snapshotPath: './fixtures/complex-test',
  updateSnapshots: false,
  normalizerConfig: {
    fieldsToNormalize: [
      { pattern: /timestamp/i, replacement: '<<TIMESTAMP>>' },
      { pattern: 'id', replacement: '<<ID>>' }
    ],
    fieldsToIgnore: ['debug_info']
  },
  verification: {
    verifyLLMRequests: true,
    verifyEventStreams: true,
    verifyToolCalls: true
  }
});
```

## API Reference

### AgentSnapshot

The main class for managing agent snapshots.

#### Constructor

```typescript
new AgentSnapshot(agent: Agent, options: AgentSnapshotOptions)
```

#### Methods

- `generate(runOptions: AgentRunOptions): Promise<SnapshotGenerationResult>`
- `replay(runOptions: AgentRunOptions, config?: TestRunConfig): Promise<SnapshotRunResult>`
- `getAgent(): Agent`
- `getCurrentLoop(): number`

### AgentSnapshotRunner

Utility class for managing multiple test cases.

```typescript
const runner = new AgentSnapshotRunner([
  {
    name: 'basic-chat',
    path: './test-cases/basic-chat.ts',
    snapshotPath: './fixtures/basic-chat'
  }
]);

// Generate all snapshots
await runner.generateAll();

// Run all tests
await runner.replayAll();
```

## Configuration Options

### AgentSnapshotOptions

```typescript
interface AgentSnapshotOptions {
  snapshotPath: string;           // Directory for snapshots
  snapshotName?: string;          // Test case name
  updateSnapshots?: boolean;      // Update mode flag
  normalizerConfig?: AgentNormalizerConfig;
  verification?: {
    verifyLLMRequests?: boolean;
    verifyEventStreams?: boolean;
    verifyToolCalls?: boolean;
  };
}
```

### Normalizer Configuration

The normalizer helps create stable snapshots by replacing dynamic values:

```typescript
interface AgentNormalizerConfig {
  fieldsToNormalize?: Array<{
    pattern: string | RegExp;
    replacement?: any;
    deep?: boolean;
  }>;
  fieldsToIgnore?: (string | RegExp)[];
  customNormalizers?: Array<{
    pattern: string | RegExp;
    normalizer: (value: any, path: string) => any;
  }>;
}
```

## Snapshot Structure

Generated snapshots follow this directory structure:

```
fixtures/
└── test-case-name/
    ├── initial/
    │   └── event-stream.jsonl
    ├── loop-1/
    │   ├── llm-request.jsonl
    │   ├── llm-response.jsonl
    │   ├── event-stream.jsonl
    │   └── tool-calls.jsonl
    ├── loop-2/
    │   └── ...
    └── event-stream.jsonl
```

## CLI Usage

```bash
# Generate snapshots
npx agent-snapshot generate my-test-case

# Run tests
npx agent-snapshot replay my-test-case

# Update snapshots
npx agent-snapshot replay my-test-case --updateSnapshot
```

## Best Practices

1. **Stable Test Data**: Use the normalizer to handle dynamic values like timestamps and IDs
2. **Focused Tests**: Create separate snapshots for different scenarios
3. **Version Control**: Commit snapshots to ensure consistent test behavior
4. **Update Mode**: Use `--updateSnapshot` carefully and review changes
5. **Verification Settings**: Adjust verification options based on test requirements

## Troubleshooting

### Common Issues

- **Snapshot Mismatch**: Check normalizer configuration for dynamic fields
- **Missing Snapshots**: Ensure snapshots are generated before running tests
- **Loop Count Errors**: Verify agent behavior consistency between runs

### Debug Tips

- Enable detailed logging by setting appropriate log levels
- Use `.actual.jsonl` files to compare expected vs actual data
- Review snapshot directory structure for completeness

## Integration with Testing Frameworks

### Vitest Example

```typescript
import { describe, it, expect } from 'vitest';
import { AgentSnapshot } from '@tarko/agent-snapshot';

describe('Agent Tests', () => {
  it('should handle basic conversation', async () => {
    const snapshot = new AgentSnapshot(agent, {
      snapshotPath: './fixtures/basic-conversation'
    });
    
    const result = await snapshot.replay("Hello world");
    expect(result.meta.loopCount).toBe(1);
  });
});
```

## License

Apache-2.0