# Context Compression

Tarko Agent provides sophisticated context compression capabilities to prevent context window overflow while preserving important conversation information. This enables agents to run for extended periods without hitting token limits.

## Overview

Context compression in Tarko Agent implements a multi-level memory hierarchy with intelligent compression strategies:

- **L0 (Permanent)**: System prompts and core instructions
- **L1 (Run)**: Current session context and planning information  
- **L2 (Loop)**: Tool calls, results, and environmental inputs
- **L3 (Ephemeral)**: Streaming chunks and temporary state

## Features

### Built-in Compression Strategies

1. **Sliding Window**: Keeps recent messages while removing older conversation history
2. **Tool Result Compression**: Compresses large tool outputs while preserving key information
3. **Image Compression**: Reduces image count using sliding window with text placeholders

### Compression Levels

- **Conservative**: Minimal compression, large sliding window (20 messages)
- **Moderate**: Balanced compression with multiple strategies (15 messages)
- **Aggressive**: Maximum compression for tight token budgets (10 messages)
- **Custom**: Define your own compression strategies

## Configuration

### Basic Setup

```typescript
import { Agent } from '@tarko/agent';

const agent = new Agent({
  name: 'Long Running Agent',
  instructions: 'You are a helpful assistant.',
  context: {
    contextCompression: {
      enabled: true,
      level: 'moderate',
      maxContextTokens: 128000,
      compressionThreshold: 0.8,
      targetCompressionRatio: 0.6,
    },
  },
  model: {
    provider: 'openai',
    id: 'gpt-4o',
  },
});
```

### Advanced Configuration

```typescript
const compressionOptions = {
  enabled: true,
  level: 'moderate',
  maxContextTokens: 128000,        // Model's context window
  compressionThreshold: 0.8,       // Trigger at 80% capacity
  targetCompressionRatio: 0.6,     // Compress to 60% of max
  maxImages: 5,                    // Keep max 5 images
  maxToolResults: 10,              // Keep max 10 tool results
  preserveRecent: true,            // Always preserve recent messages
  recentMessageCount: 3,           // Number of recent messages to preserve
};

const agent = new Agent({
  context: { contextCompression: compressionOptions },
  // ... other options
});
```

### Custom Strategies

```typescript
import { 
  SlidingWindowStrategy, 
  ToolResultCompressionStrategy,
  ImageCompressionStrategy 
} from '@tarko/agent';

const customStrategies = [
  new SlidingWindowStrategy(12, true),           // 12 message window
  new ToolResultCompressionStrategy(300, 0.4),   // 300 token limit, 40% compression
  new ImageCompressionStrategy(3, true),         // Keep 3 most recent images
];

const agent = new Agent({
  context: {
    contextCompression: {
      enabled: true,
      customStrategies,
      maxContextTokens: 100000,
    },
  },
});
```

## Compression Strategies

### Sliding Window Strategy

Keeps the most recent N messages while removing older conversation history.

```typescript
const slidingWindow = new SlidingWindowStrategy(
  windowSize: 10,              // Keep last 10 messages
  preserveSystemPrompt: true   // Always keep system prompt
);
```

**When it applies**: When context reaches 80% of token limit
**Best for**: General conversation compression

### Tool Result Compression Strategy

Compresses large tool outputs while preserving important information.

```typescript
const toolCompression = new ToolResultCompressionStrategy(
  maxToolResultTokens: 500,    // Max tokens per tool result
  compressionRatio: 0.3        // Compress to 30% of original
);
```

**When it applies**: When context reaches 70% of token limit
**Best for**: APIs returning large data, file operations, web scraping

### Image Compression Strategy

Reduces image count by replacing older images with text placeholders.

```typescript
const imageCompression = new ImageCompressionStrategy(
  maxImages: 5,               // Keep max 5 images
  preserveRecent: true        // Keep most recent images
);
```

**When it applies**: When context reaches 60% of token limit
**Best for**: Multimodal conversations with many images

## Creating Custom Strategies

Implement the `ContextCompressionStrategy` interface:

```typescript
import { ContextCompressionStrategy, CompressionContext, CompressionResult } from '@tarko/agent-interface';

class MyCustomStrategy implements ContextCompressionStrategy {
  readonly name = 'my_custom_strategy';
  readonly description = 'My custom compression logic';

  shouldCompress(context: CompressionContext): boolean {
    // Return true when compression should be applied
    return context.currentTokens > context.maxTokens * 0.75;
  }

  compress(
    messages: ChatCompletionMessageParam[],
    context: CompressionContext
  ): CompressionResult {
    // Implement your compression logic
    const compressedMessages = this.applyCustomCompression(messages);
    
    return {
      messages: compressedMessages,
      stats: {
        originalTokens: context.currentTokens,
        compressedTokens: this.estimateTokens(compressedMessages),
        compressionRatio: 0.7,
        originalMessageCount: messages.length,
        compressedMessageCount: compressedMessages.length,
        originalImageCount: this.countImages(messages),
        compressedImageCount: this.countImages(compressedMessages),
        appliedStrategies: [this.name],
      },
      wasCompressed: true,
    };
  }

  private applyCustomCompression(messages: ChatCompletionMessageParam[]) {
    // Your compression implementation
    return messages;
  }
}
```

## Token Estimation

The system uses a conservative token estimator to avoid context overflow:

```typescript
import { SimpleTokenEstimator } from '@tarko/agent';

const estimator = new SimpleTokenEstimator();

const textTokens = estimator.estimateTextTokens('Hello, world!');
const imageTokens = estimator.estimateImageTokens({ width: 512, height: 512 });
const messageTokens = estimator.estimateMessageTokens({
  role: 'user',
  content: 'How are you?'
});
```

## Monitoring and Debugging

Compression events are logged with detailed statistics:

```
[ContextCompression] Applying context compression | Current: 95000 tokens | Target: 76800 tokens
[ContextCompression] Context compression completed | Original: 95000 tokens | Compressed: 72000 tokens | Ratio: 75.8% | Strategies: image_compression, tool_result_compression, sliding_window
```

## Best Practices

### 1. Choose Appropriate Compression Levels

- **Conservative**: For critical conversations where context preservation is important
- **Moderate**: For general-purpose agents with balanced performance
- **Aggressive**: For resource-constrained environments or very long conversations

### 2. Configure Token Limits Properly

```typescript
// For different models
const modelConfigs = {
  'gpt-4o': { maxContextTokens: 128000 },
  'gpt-4o-mini': { maxContextTokens: 128000 },
  'claude-3-sonnet': { maxContextTokens: 200000 },
  'claude-3-haiku': { maxContextTokens: 200000 },
};
```

### 3. Adjust Compression Thresholds

```typescript
// Conservative: compress later, preserve more context
{
  compressionThreshold: 0.9,
  targetCompressionRatio: 0.8,
}

// Aggressive: compress earlier, save more tokens
{
  compressionThreshold: 0.6,
  targetCompressionRatio: 0.4,
}
```

### 4. Handle Multimodal Content

```typescript
// For image-heavy conversations
{
  level: 'moderate',
  maxImages: 3,
  compressionThreshold: 0.7, // Compress earlier due to image token cost
}

// For tool-heavy workflows
{
  level: 'moderate',
  maxToolResults: 15,
  targetCompressionRatio: 0.5,
}
```

## Migration from Legacy Image Limiting

If you're using the legacy `maxImagesCount` parameter:

```typescript
// Old way
const agent = new Agent({
  context: {
    maxImagesCount: 5,
  },
});

// New way
const agent = new Agent({
  context: {
    contextCompression: {
      enabled: true,
      level: 'conservative',
      maxImages: 5,
    },
  },
});
```

The legacy parameter is automatically converted to compression options for backward compatibility.

## Performance Considerations

- Token estimation is fast (< 1ms for typical messages)
- Compression strategies run in sequence, typically < 10ms total
- Memory usage is minimal - strategies operate on message references
- Compression is only applied when necessary (threshold-based)

## Troubleshooting

### Context Still Overflowing

1. Lower the `compressionThreshold` (e.g., from 0.8 to 0.6)
2. Increase compression aggressiveness (`level: 'aggressive'`)
3. Reduce `targetCompressionRatio` (e.g., from 0.6 to 0.4)
4. Check `maxContextTokens` matches your model's actual limit

### Important Context Being Lost

1. Increase `recentMessageCount` to preserve more recent messages
2. Use `level: 'conservative'` for gentler compression
3. Implement custom strategies that preserve domain-specific information
4. Increase `maxImages` and `maxToolResults` if needed

### Performance Issues

1. Disable compression for short conversations (`enabled: false`)
2. Use `level: 'conservative'` to reduce compression frequency
3. Increase `compressionThreshold` to delay compression

## Examples

See `examples/context-compression-example.ts` for complete working examples demonstrating:

- Basic compression setup
- Custom strategy implementation
- Different compression levels
- Monitoring and debugging
