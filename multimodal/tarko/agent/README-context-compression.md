# Context Compression for Tarko Agent

This module provides context compression strategies to manage context window limits in long-running agent conversations. It prevents "Prompt too long" errors by intelligently compressing older conversation history while preserving important context.

## Overview

The context compression system is inspired by successful approaches from:

- **Manus**: Never-lose approach with external storage
- **Claude Code**: 8-section structured summarization with 92% threshold
- **Gemini CLI**: Sliding window with 70% threshold and 30% preservation

## Quick Start

```typescript
import { Agent } from '@tarko/agent';

// Basic usage with default sliding window strategy
const agent = new Agent({
  context: {
    compression: {
      enabled: true,
      strategy: 'sliding_window',
      compressionThreshold: 0.7, // Trigger at 70% of context window
      targetCompressionRatio: 0.3, // Compress to 30% of original size
    },
  },
});

// Run the agent - compression happens automatically
const response = await agent.run('Hello, how can you help me?');
```

## Built-in Strategies

### 1. Sliding Window Strategy (`sliding_window`)

**Inspired by Gemini CLI's approach**

- Keeps recent messages and discards older ones
- Preserves system messages and conversation structure
- Simple and predictable behavior

```typescript
const agent = new Agent({
  context: {
    compression: {
      strategy: 'sliding_window',
      compressionThreshold: 0.7, // Gemini CLI uses 70%
      strategyConfig: {
        preserveRatio: 0.3, // Keep 30% of messages
        preserveSystemMessage: true,
        preserveRecentUserMessages: 3,
        preserveRecentAssistantMessages: 3,
      },
    },
  },
});
```

### 2. Structured Summary Strategy (`structured_summary`)

**Inspired by Claude Code's 8-section approach**

- Creates structured summaries of older conversation
- Preserves recent messages intact
- Uses 8-section structure for comprehensive coverage

```typescript
const agent = new Agent({
  context: {
    compression: {
      strategy: 'structured_summary',
      compressionThreshold: 0.92, // Claude Code uses 92%
      strategyConfig: {
        preserveRecentMessages: 10,
        useEightSectionStructure: true,
        summaryTemperature: 0.3,
        maxSummaryTokens: 2000,
      },
    },
  },
});
```

### 3. Tool Response Compression Strategy (`tool_response_compression`)

**Inspired by Manus's external storage approach**

- Compresses large tool responses while preserving metadata
- Keeps error messages and important operations intact
- Maintains tool call structure

```typescript
const agent = new Agent({
  context: {
    compression: {
      strategy: 'tool_response_compression',
      compressionThreshold: 0.8,
      strategyConfig: {
        maxToolResponseLength: 500,
        preserveErrors: true,
        preserveFileOperations: true,
        neverCompressTools: ['error', 'system'],
        compressionRatio: 0.2,
      },
    },
  },
});
```

### 4. Smart Truncation Strategy (`smart_truncation`)

**Hybrid approach with intelligent message selection**

- Scores messages by importance and recency
- Preserves critical message types
- Balances context preservation with token limits

```typescript
const agent = new Agent({
  context: {
    compression: {
      strategy: 'smart_truncation',
      compressionThreshold: 0.75,
      strategyConfig: {
        preserveSystemMessages: true,
        preserveUserMessages: true,
        preserveRecentTurns: 5,
        maxToolCallsToPreserve: 10,
        importantToolTypes: ['error', 'file_read', 'file_write'],
      },
    },
  },
});
```

## Configuration Options

```typescript
interface AgentContextCompressionOptions {
  /** Whether compression is enabled (default: true) */
  enabled?: boolean;

  /** Compression strategy name (default: 'sliding_window') */
  strategy?: string;

  /** Threshold for triggering compression (default: 0.7) */
  compressionThreshold?: number;

  /** Target size after compression (default: 0.3) */
  targetCompressionRatio?: number;

  /** Minimum messages to preserve (default: 5) */
  minMessagesToKeep?: number;

  /** Max compression attempts per session (default: 10) */
  maxCompressionAttempts?: number;

  /** Strategy-specific configuration */
  strategyConfig?: Record<string, any>;
}
```

## Custom Strategies

You can create custom compression strategies by implementing the `ContextCompressionStrategy` interface:

```typescript
import { 
  ContextCompressionStrategy, 
  CompressionContext, 
  CompressionResult,
  registerCompressionStrategy 
} from '@tarko/agent';

class MyCustomStrategy implements ContextCompressionStrategy {
  readonly name = 'my_custom_strategy';
  readonly description = 'My custom compression approach';

  shouldCompress(context: CompressionContext): boolean {
    // Your compression trigger logic
    return context.currentTokens >= context.maxTokens * 0.8;
  }

  async compress(context: CompressionContext): Promise<CompressionResult> {
    // Your compression implementation
    const compressedMessages = /* your logic */;
    
    return {
      messages: compressedMessages,
      estimatedTokens: /* estimated count */,
      stats: {
        originalTokens: context.currentTokens,
        compressedTokens: /* new count */,
        compressionRatio: /* ratio */,
        originalMessageCount: context.messages.length,
        compressedMessageCount: compressedMessages.length,
        compressionTimeMs: /* time taken */,
        strategy: this.name,
      },
    };
  }
}

// Register your custom strategy
registerCompressionStrategy(new MyCustomStrategy());

// Use it in an agent
const agent = new Agent({
  context: {
    compression: {
      strategy: 'my_custom_strategy',
    },
  },
});
```

## Manual Compression

You can also trigger compression manually:

```typescript
import { ContextManager } from '@tarko/agent';

const contextManager = new ContextManager({
  strategy: 'sliding_window',
  compressionThreshold: 0.7,
});

// Manual compression
const result = await contextManager.manualCompress(
  messages,
  events,
  'session-id',
  iteration
);

console.log(`Compressed ${result.stats.originalMessageCount} → ${result.stats.compressedMessageCount} messages`);
```

## Monitoring and Statistics

The compression system provides detailed statistics and monitoring:

```typescript
// Get compression statistics
const stats = contextManager.getCompressionStats();
console.log({
  totalCompressions: stats.totalCompressions,
  averageCompressionRatio: stats.averageCompressionRatio,
  totalTokensSaved: stats.totalTokensSaved,
  strategyUsage: stats.strategyUsage,
});

// Get compression history
const history = contextManager.getCompressionHistory();
history.forEach(event => {
  console.log(`Session ${event.sessionId}: ${event.stats.strategy} compression`);
});

// Get current context information
const info = await contextManager.getContextInfo(messages);
console.log({
  currentTokens: info.currentTokens,
  maxTokens: info.maxTokens,
  usagePercentage: info.usagePercentage,
  needsCompression: info.needsCompression,
});
```

## Event Stream Integration

Compression events are automatically sent to the agent's event stream:

```typescript
// Listen for compression events
agent.getEventStream().subscribe((event) => {
  if (event.type === 'system' && event.message.includes('Context compressed')) {
    console.log('Compression occurred:', event.details);
  }
});
```

## Safety Guarantees

The context compression system includes multiple layers of safety to prevent context overflow:

### 1. Multi-Layer Protection

- **Preprocessing**: Automatically truncates oversized individual messages
- **Strategy Compression**: Applies the selected compression strategy
- **Validation**: Validates compressed results don't exceed limits
- **Emergency Compression**: Last-resort aggressive compression if needed
- **Graceful Fallback**: Returns minimal viable context if all else fails

### 2. Emergency Compression

When normal compression strategies fail or produce oversized results:

```typescript
// Automatic emergency compression
const contextManager = new ContextManager({
  strategy: 'sliding_window',
  compressionThreshold: 0.7,
});

// If normal compression fails, emergency compression automatically triggers:
// 1. Keeps system messages (truncated if needed)
// 2. Keeps last user message (truncated if needed)
// 3. Discards everything else
// 4. Ensures result fits in 50% of context window
```

### 3. Safety Margins

- **5% preprocessing margin**: Prevents edge cases during compression
- **10% validation margin**: Ensures compressed results have breathing room
- **50% emergency limit**: Conservative emergency compression target

### 4. Oversized Message Handling

```typescript
// Individual messages exceeding 30% of context window are automatically truncated
const message = {
  role: 'user',
  content: 'Very long content...', // If > 30% of context window
};

// Becomes:
// {
//   role: 'user',
//   content: 'Truncated content... [truncated for context limit]'
// }
```

## Best Practices

1. **Choose the right strategy**:
   - Use `sliding_window` for simple, predictable compression
   - Use `structured_summary` for comprehensive context preservation
   - Use `tool_response_compression` when dealing with large tool outputs
   - Use `smart_truncation` for balanced, intelligent selection

2. **Set appropriate thresholds**:
   - Conservative: 70% (Gemini CLI approach)
   - Balanced: 75-80%
   - Aggressive: 92% (Claude Code approach)

3. **Monitor compression performance**:
   - Check compression statistics regularly
   - Adjust thresholds based on your use case
   - Consider the trade-off between context preservation and performance

4. **Handle compression gracefully**:
   - The system has multiple fallback layers
   - Monitor system events for compression notifications
   - Emergency compression events are logged with `[EMERGENCY]` marker
   - Test with your specific conversation patterns

5. **Safety monitoring**:
   - Watch for emergency compression events in logs
   - Adjust thresholds if emergency compression triggers frequently
   - Consider using more aggressive strategies for high-volume scenarios

## Troubleshooting

### Compression Not Triggering

- Check if compression is enabled: `compression.enabled = true`
- Verify threshold settings: lower `compressionThreshold` for earlier triggering
- Ensure sufficient message history exists

### Poor Compression Results

- Try different strategies for your use case
- Adjust strategy-specific configuration
- Consider custom strategy implementation

### Performance Issues

- Monitor compression timing in statistics
- Consider simpler strategies for high-frequency scenarios
- Adjust compression frequency with thresholds

## Migration Guide

Existing agents will continue to work without changes. To enable compression:

```typescript
// Before
const agent = new Agent({
  context: {
    maxImagesCount: 5,
  },
});

// After - add compression configuration
const agent = new Agent({
  context: {
    maxImagesCount: 5,
    compression: {
      enabled: true,
      strategy: 'sliding_window',
      compressionThreshold: 0.7,
    },
  },
});
```

The compression system is designed to be backward compatible and non-intrusive.
