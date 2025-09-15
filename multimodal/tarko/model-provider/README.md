# @tarko/model-provider

A high-level TypeScript SDK to configure multiple OpenAI-compatible providers and select one to run.

## Installation

```bash
npm install @tarko/model-provider
```

## Features

- 🔌 **Multi-Provider Support**: OpenAI, Ollama, LM Studio, Volcengine, DeepSeek, and more
- 🎯 **Unified Interface**: Single API for all providers with OpenAI-compatible interface
- ⚙️ **Smart Resolution**: Automatic model configuration resolution with fallbacks
- 🔧 **Extensible**: Easy to add new providers through configuration
- 🤖 **Smart Headers**: Automatic Claude beta headers for enhanced features
- 📦 **Type Safe**: Full TypeScript support with strict typing

## Quick Start

### Basic Usage

```typescript
import { createLLMClient, resolveModel } from '@tarko/model-provider';

// Resolve model configuration
const model = resolveModel(
  {
    provider: 'openai',
    id: 'gpt-4o',
    apiKey: 'your-api-key'
  }
);

// Create LLM client
const client = createLLMClient(model);

// Use the client
const response = await client.chat.completions.create({
  model: model.id,
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### Supported Providers

| Provider | Base URL | Default Port |
|----------|----------|-------------|
| `openai` | https://api.openai.com/v1 | - |
| `ollama` | http://127.0.0.1:11434/v1 | 11434 |
| `lm-studio` | http://127.0.0.1:1234/v1 | 1234 |
| `volcengine` | https://ark.cn-beijing.volces.com/api/v3 | - |
| `deepseek` | https://api.deepseek.com/v1 | - |

### Advanced Configuration

```typescript
import { AgentModel, ModelProviderName } from '@tarko/model-provider';

// Custom model configuration
const customModel: AgentModel = {
  provider: 'ollama',
  id: 'llama3.2',
  displayName: 'Llama 3.2 Local',
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama'
};

const client = createLLMClient(customModel);
```

### Runtime Model Override

```typescript
// Override model at runtime
const resolvedModel = resolveModel(
  defaultModel,     // Base configuration
  'gpt-4o-mini',   // Runtime model override
  'openai'         // Runtime provider override
);
```

### Automatic Claude Headers

The library automatically adds required beta headers for Claude models to enable advanced features:

```typescript
// Claude models automatically get beta headers
const claudeModel = resolveModel({
  provider: 'anthropic',
  id: 'claude-3-5-sonnet-20241022',
  apiKey: 'your-anthropic-key'
});

// Automatically includes:
// headers: {
//   'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
// }

// Custom headers are preserved and merged
const customClaudeModel = resolveModel({
  provider: 'anthropic',
  id: 'claude-3-haiku',
  headers: {
    'X-Custom': 'value'
  }
});
// Results in both custom and automatic headers
```

Supported Claude model patterns:
- `claude-*` (e.g., `claude-3-sonnet`, `claude-3-5-sonnet-20241022`)
- `anthropic/*` (e.g., `anthropic/claude-3-haiku`)

## API Reference

### Types

#### `AgentModel`
```typescript
interface AgentModel {
  id: string;                           // Model identifier
  provider: ModelProviderName;          // Provider name
  displayName?: string;                 // Display name
  baseProvider?: BaseModelProviderName; // Base implementation
  apiKey?: string;                      // API key
  baseURL?: string;                     // Base URL
  headers?: Record<string, string>;     // Custom headers (auto-merged with provider defaults)
}
```

#### `ModelProviderName`
```typescript
type ModelProviderName = 
  | 'openai' | 'anthropic' | 'azure-openai'
  | 'ollama' | 'lm-studio' | 'volcengine' | 'deepseek';
```

### Functions

#### `resolveModel(agentModel?, runModel?, runProvider?)`
Resolves model configuration with runtime overrides and defaults.

#### `createLLMClient(agentModel, requestInterceptor?)`
Creates an OpenAI-compatible client for the specified model.

## License

Apache-2.0
