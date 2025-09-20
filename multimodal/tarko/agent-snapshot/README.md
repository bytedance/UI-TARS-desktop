# @tarko/agent-snapshot

A snapshot-based testing framework for `@tarko/agent` that captures and replays agent interactions for deterministic testing.

## Features

- **Snapshot Generation**: Record real agent interactions with LLMs and tools
- **Deterministic Replay**: Test agents using captured snapshots without external dependencies
- **Flexible Verification**: Configurable verification of LLM requests, event streams, and tool calls
- **Smart Normalization**: Automatic normalization of dynamic values (timestamps, IDs) for consistent comparisons

## Installation

```bash
npm install @tarko/agent-snapshot
```

## Quick Start

### Basic Usage

```typescript
import { AgentSnapshot } from '@tarko/agent-snapshot';
import { Agent } from '@tarko/agent';

// Create your agent
const agent = new Agent({
  // agent configuration
});

// Create snapshot tester
const snapshot = new AgentSnapshot(agent, {
  snapshotPath: './test-snapshots/my-test'
});

// Generate snapshot (runs with real LLM)
const input = "What's the weather like?";
await snapshot.generate(input);

// Test against snapshot (uses mocked responses)
const result = await snapshot.test(input);
console.log('Test passed!', result.response);
```

### Advanced Configuration

```typescript
const snapshot = new AgentSnapshot(agent, {
  snapshotPath: './snapshots/complex-test',
  normalizerConfig: {
    fieldsToNormalize: [
      { pattern: /requestId/, replacement: '<<REQUEST_ID>>' },
      { pattern: 'timestamp', replacement: '<<TIMESTAMP>>' }
    ],
    fieldsToIgnore: ['debugInfo']
  },
  verification: {
    verifyLLMRequests: true,
    verifyEventStreams: true,
    verifyToolCalls: false // Skip tool call verification
  }
});
```

### Batch Testing with AgentSnapshotRunner

```typescript
import { AgentSnapshotRunner } from '@tarko/agent-snapshot';

const runner = new AgentSnapshotRunner([
  {
    name: 'weather-query',
    path: './test-cases/weather.ts',
    snapshotPath: './snapshots/weather'
  },
  {
    name: 'complex-reasoning',
    path: './test-cases/reasoning.ts', 
    snapshotPath: './snapshots/reasoning'
  }
]);

// Generate all snapshots
await runner.generateAll();

// Test all snapshots
const results = await runner.testAll();
```

## API Reference

### AgentSnapshot

Main class for snapshot-based testing.

#### Constructor

```typescript
new AgentSnapshot(agent: Agent, options: AgentSnapshotOptions)
```

#### Methods

- `generate(input)` - Generate snapshot with real LLM calls
- `test(input, config?)` - Test against existing snapshot
- `updateNormalizerConfig(config)` - Update normalization settings

### AgentSnapshotOptions

```typescript
interface AgentSnapshotOptions {
  snapshotPath: string;           // Directory for snapshots
  snapshotName?: string;          // Custom snapshot name
  normalizerConfig?: AgentNormalizerConfig;
  verification?: {
    verifyLLMRequests?: boolean;  // Default: true
    verifyEventStreams?: boolean; // Default: true  
    verifyToolCalls?: boolean;    // Default: true
  };
}
```

## Best Practices

1. **Organize snapshots by feature**: Use descriptive paths like `./snapshots/feature/scenario`
2. **Version control snapshots**: Include snapshot files in your repository
3. **Update snapshots intentionally**: Use update mode only when agent behavior legitimately changes
4. **Configure normalization**: Normalize dynamic values that shouldn't affect test outcomes
5. **Selective verification**: Disable verification for non-deterministic components when needed

## Snapshot Structure

```
snapshots/
└── my-test/
    ├── event-stream.jsonl      # Final event stream state
    ├── loop-1/
    │   ├── llm-request.jsonl   # LLM request for loop 1
    │   ├── llm-response.jsonl  # LLM response for loop 1
    │   ├── event-stream.jsonl  # Event stream at loop 1
    │   └── tool-calls.jsonl    # Tool calls in loop 1
    └── loop-2/
        └── ...
```

## Integration with Testing Frameworks

### Vitest Example

```typescript
import { describe, it, expect } from 'vitest';
import { AgentSnapshot } from '@tarko/agent-snapshot';

describe('Agent Tests', () => {
  it('should handle weather queries', async () => {
    const snapshot = new AgentSnapshot(agent, {
      snapshotPath: './snapshots/weather-test'
    });
    
    const result = await snapshot.test('What is the weather in Tokyo?');
    expect(result.meta.loopCount).toBe(2);
    expect(result.response).toMatchSnapshot();
  });
});
```

## Troubleshooting

### Common Issues

1. **Snapshot mismatch**: Check `.actual.jsonl` files for differences
2. **Dynamic values**: Configure normalizer to handle timestamps, IDs, etc.
3. **Tool call variations**: Consider disabling tool call verification for non-deterministic tools
4. **Path issues**: Ensure snapshot directories exist and are writable

### Debug Mode

Enable detailed logging:

```typescript
import { logger } from '@tarko/agent-snapshot/utils';
logger.setLevel('debug');
```
