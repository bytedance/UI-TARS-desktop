# Claude Headers Architecture

## Overview

This document describes the architecture for automatically adding `anthropic-beta` headers when using Claude models in the LLM client.

## Architecture Design

### Core Principles

1. **Single Responsibility**: Each component handles a specific aspect of header management
2. **Open/Closed Principle**: Easy to extend for new providers without modifying existing code
3. **Dependency Injection**: Configuration-driven rather than hardcoded
4. **Type Safety**: Full TypeScript support with proper type definitions

### Components

#### 1. HeaderConfigRegistry

**Purpose**: Central registry for managing provider-specific header configurations.

**Key Features**:
- Register header configurations for different providers
- Generate headers based on model and request parameters
- Support for static, dynamic, and conditional headers

```typescript
interface ProviderHeaderConfig {
  static?: Record<string, string>;           // Always included
  dynamic?: (model: string) => Record<string, string>;  // Based on model
  conditional?: (params: any) => Record<string, string>; // Based on request
}
```

#### 2. ClaudeModelDetector

**Purpose**: Utility class for detecting Claude models and managing Claude-specific features.

**Key Features**:
- Pattern-based model detection
- Centralized beta feature management
- Easy to update when new Claude models are released

#### 3. Configuration Integration

**Purpose**: Seamless integration with existing configuration system.

**Key Features**:
- Extends `ConfigOptions` with header-related options
- Automatic initialization of default configurations
- User control over automatic header behavior

### Data Flow

```mermaid
graph TD
    A[User Creates TokenJS Instance] --> B[initializeDefaultConfigs()]
    B --> C[Register Anthropic Config]
    C --> D[User Makes API Call]
    D --> E[AnthropicHandler.create()]
    E --> F[Generate Provider Headers]
    F --> G[Merge with User Headers]
    G --> H[Create Anthropic Client]
    H --> I[Make API Request]
```

## Implementation Details

### Automatic Header Addition

When a Claude model is detected, the following headers are automatically added:

```typescript
{
  'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
}
```

### Configuration Options

```typescript
const client = new TokenJS({
  apiKey: 'your-key',
  headers: {                    // Custom headers (merged with auto headers)
    'X-Custom': 'value'
  },
  autoHeaders: true            // Enable/disable automatic headers (default: true)
});
```

### Model Detection

Claude models are detected using these patterns:
- `/^claude-/i` - Matches "claude-" prefix
- `/^anthropic\//i` - Matches "anthropic/" prefix

### Conditional Headers

Additional headers may be added based on request parameters:
- Tool usage: Ensures tool streaming features are enabled
- Future: Can be extended for other conditional scenarios

## Usage Examples

### Basic Usage (Automatic Headers)

```typescript
const client = new TokenJS({ apiKey: 'your-key' });

const response = await client.chat.completions.create({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',  // Auto-detected as Claude
  messages: [{ role: 'user', content: 'Hello' }]
});
// Headers: { 'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19' }
```

### Custom Headers

```typescript
const client = new TokenJS({
  apiKey: 'your-key',
  headers: { 'X-Custom': 'value' }
});

// Both automatic and custom headers will be included
```

### Disable Automatic Headers

```typescript
const client = new TokenJS({
  apiKey: 'your-key',
  autoHeaders: false  // No automatic headers
});
```

### Tool Usage (Conditional Headers)

```typescript
const response = await client.chat.completions.create({
  provider: 'anthropic',
  model: 'claude-3-sonnet',
  tools: [/* tool definitions */],  // Triggers additional headers
  messages: [/* messages */]
});
```

## Extensibility

### Adding New Provider Configurations

```typescript
HeaderConfigRegistry.register('openai', {
  static: { 'X-Provider': 'openai' },
  dynamic: (model) => ({ 'X-Model': model }),
  conditional: (params) => {
    if (params.temperature > 0.8) {
      return { 'X-High-Temp': 'true' };
    }
    return {};
  }
});
```

### Updating Claude Beta Features

To add new beta features, update the `ClaudeModelDetector.getClaudeBetaFeatures()` method:

```typescript
static getClaudeBetaFeatures(): string[] {
  return [
    'fine-grained-tool-streaming-2025-05-14',
    'token-efficient-tools-2025-02-19',
    'new-feature-2025-06-01',  // Add new features here
  ];
}
```

### Adding New Claude Model Patterns

```typescript
private static readonly CLAUDE_MODEL_PATTERNS = [
  /^claude-/i,
  /^anthropic\//i,
  /^new-claude-pattern/i,  // Add new patterns here
];
```

## Testing

The architecture includes comprehensive tests:

- Unit tests for each component
- Integration tests for the complete flow
- Mock-based testing for external dependencies

Run tests with:
```bash
npm test src/config/__tests__/headers.test.ts
```

## Benefits

1. **Automatic**: No manual header management required
2. **Flexible**: Users can override or disable automatic behavior
3. **Extensible**: Easy to add new providers or features
4. **Type-Safe**: Full TypeScript support
5. **Testable**: Comprehensive test coverage
6. **Maintainable**: Clear separation of concerns

## Future Enhancements

1. **Dynamic Feature Detection**: Automatically detect available beta features from API
2. **Model-Specific Features**: Different beta features for different Claude models
3. **Configuration Validation**: Validate header configurations at registration time
4. **Performance Optimization**: Cache generated headers for repeated requests
5. **Logging**: Optional logging of header generation for debugging

## Migration Guide

Existing code will continue to work without changes. The new header system is:
- **Backward Compatible**: No breaking changes
- **Opt-in Enhanced**: Additional features available through configuration
- **Progressive**: Can be adopted incrementally

### Before
```typescript
const client = new TokenJS({ apiKey: 'key' });
// Manual header management required
```

### After
```typescript
const client = new TokenJS({ apiKey: 'key' });
// Headers automatically managed for Claude models
```
