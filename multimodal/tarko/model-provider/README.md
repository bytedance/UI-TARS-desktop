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
- 🔗 **Custom Headers**: Support for custom headers with automatic provider enhancements
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
| `minimax` | https://api.minimax.io/v1 | - |

### MiniMax Configuration

The recommended MiniMax models are `MiniMax-M3.1-Flash` and `MiniMax-M3`. The `minimax` provider uses `MiniMax-M3.1-Flash` when no model ID is supplied to `resolveModel`, and defaults to the global OpenAI-compatible endpoint. For either `minimax` or `anthropic` with a known MiniMax Anthropic endpoint below, the resolver selects the Anthropic protocol and also defaults to `MiniMax-M3.1-Flash`. Explicit saved, legacy, custom, and runtime model IDs remain unchanged. Override `baseURL` when using the China endpoint or the Anthropic-compatible protocol:

| Protocol             | Global                             | China                                |
| -------------------- | ---------------------------------- | ------------------------------------ |
| OpenAI-compatible    | `https://api.minimax.io/v1`        | `https://api.minimaxi.com/v1`        |
| Anthropic-compatible | `https://api.minimax.io/anthropic` | `https://api.minimaxi.com/anthropic` |

Use `provider: 'minimax'` with the OpenAI-compatible endpoints. For Anthropic-compatible requests, use `provider: 'anthropic'` and one of the Anthropic base URLs above. The Anthropic SDK appends `/v1/messages` to that base URL.

```typescript
const model = resolveModel({
  provider: 'anthropic',
  id: 'MiniMax-M3.1-Flash',
  baseURL: 'https://api.minimax.io/anthropic',
  apiKey: 'your-api-key',
});
```

Flash always uses adaptive thinking; the agent's generic reasoning switch does not disable it. For the `minimax` provider's OpenAI-compatible requests, set `params.reasoning_effort` to `low`, `medium`, `high`, `xhigh`, or `max` when needed (the API default is `max`). Do not send disabled thinking, `reasoning_effort: 'none'`, `service_tier`, or `reasoning_split: false` for Flash. The Anthropic adapter uses the API's default thinking and effort settings. It exposes thinking as `reasoning_content` and retains signed native blocks in `anthropic_content` for continuation. Pass that field back with assistant messages when using the SDK directly; the agent preserves it automatically through its event history, including tool-result turns.

See the [MiniMax OpenAI-compatible API](https://platform.minimax.io/docs/api-reference/text-openai-api) and [Anthropic-compatible API](https://platform.minimax.io/docs/api-reference/text-anthropic-api) for protocol details.

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

### Custom Headers Support

Add custom headers to any model configuration:

```typescript
// Custom headers for any provider
const modelWithHeaders = resolveModel({
  provider: 'openai',
  id: 'gpt-4',
  headers: {
    'X-Custom-Header': 'value',
    'Authorization': 'Bearer custom-token'
  }
});

// Headers are passed through to the underlying HTTP client
const client = createLLMClient(modelWithHeaders);
```

**Automatic Provider Enhancements:**
- Claude models (`claude-*`, `anthropic/*`) automatically get `anthropic-beta` headers
- Custom headers merge with automatic provider headers
- Headers are validated and passed to the HTTP client

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
  | 'ollama' | 'lm-studio' | 'volcengine' | 'deepseek' | 'minimax';
```

### Functions

#### `resolveModel(agentModel?, runModel?, runProvider?)`
Resolves model configuration with runtime overrides and defaults.

#### `createLLMClient(agentModel, requestInterceptor?)`
Creates an OpenAI-compatible client for the specified model.

## License

Apache-2.0
