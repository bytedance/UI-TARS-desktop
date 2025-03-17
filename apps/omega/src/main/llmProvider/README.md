# Unified LLM Provider Interface

This module provides a unified interface for working with different Large Language Model (LLM) providers, including:

- OpenAI
- Anthropic (Claude)
- Azure OpenAI
- Google Gemini
- Mistral

## Features

- Unified API for different LLM providers
- Automatic provider selection based on model name
- Explicit provider selection
- Simple configuration via environment variables or code
- Support for streaming responses
- Support for function/tool calling
- Abort mechanism for ongoing requests

## Installation

This module is part of the Open Agent project. No additional installation is required if you're already using the project.

However, you need to install the necessary dependencies for each provider you want to use:

```bash
# For OpenAI
npm install openai

# For Anthropic
npm install @anthropic-ai/sdk

# For Google Gemini
npm install @google/generative-ai

# For Mistral
npm install @mistralai/mistralai
```

## Configuration

### Environment Variables

Configure your API keys and default models in the `.env` file:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_BASE_URL=your_openai_base_url_here # Optional
OPENAI_DEFAULT_MODEL=gpt-4o # Optional, defaults to gpt-4o

# Azure OpenAI API Configuration
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint_here
AZURE_OPENAI_API_VERSION=your_azure_openai_api_version_here
AZURE_OPENAI_MODEL=your_azure_openai_model_here
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here

# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_API_BASE_URL=your_anthropic_base_url_here # Optional
ANTHROPIC_DEFAULT_MODEL=claude-3-sonnet-20240229 # Optional

# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_BASE_URL=your_gemini_base_url_here # Optional
GEMINI_DEFAULT_MODEL=gemini-1.5-pro # Optional

# Mistral API Configuration
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_API_BASE_URL=your_mistral_base_url_here # Optional
MISTRAL_DEFAULT_MODEL=mistral-large-latest # Optional
```

### Code Configuration

Alternatively, you can configure the provider in code:

```typescript
import { createLLM, LLMConfig } from './llmProvider';

const config: LLMConfig = {
  model: 'claude-3-sonnet-20240229',
  apiKey: 'your_api_key_here',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 1.0,
  // ...other options
};

const llm = createLLM(config);
```

## Usage

### Basic Usage with the Default Instance

```typescript
import { llm } from './llmProvider';

async function main() {
  const response = await llm.askLLMText({
    messages: [{ role: 'user', content: 'Hello, how are you?' }],
    requestId: 'request-1',
  });
  
  console.log(response);
}
```

### Creating a Custom Instance

```typescript
import { createLLM, LLMConfig } from './llmProvider';

// Create a new LLM instance with specific configuration
const config: LLMConfig = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2000,
};

const customLLM = createLLM(config);
```

### Specifying the Provider Explicitly

```typescript
import { createLLM } from './llmProvider';

// Create a new LLM instance with a specific provider
const mistralLLM = createLLM({ model: 'mistral-large-latest' }, 'mistral');
```

### Switching Providers at Runtime

```typescript
import { createLLM } from './llmProvider';

const dynamicLLM = createLLM({ model: 'gpt-4o' });

// Later, switch to a different provider
dynamicLLM.setProvider({ model: 'claude-3-opus-20240229' });
```

### Using Streaming Responses

```typescript
import { llm } from './llmProvider';

async function streamingExample() {
  const stream = llm.askLLMTextStream({
    messages: [{ role: 'user', content: 'Write a short story about a robot.' }],
    requestId: 'stream-1',
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk); // Print each chunk as it arrives
  }
}
```

### Using Tool Calls (Function Calling)

```typescript
import { llm } from './llmProvider';
import { ChatCompletionTool } from 'openai/resources';

async function toolExample() {
  // Define tools in OpenAI format
  const tools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get the current weather in a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g., San Francisco, CA',
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit'],
              description: 'The unit of temperature',
            },
          },
          required: ['location'],
        },
      },
    },
  ];

  const response = await llm.askTool({
    messages: [{ role: 'user', content: 'What is the weather like in New York?' }],
    tools,
    requestId: 'tool-1',
    toolChoice: 'auto', // 'auto', 'none', or 'required'
  });

  console.log('Content:', response.content);
  console.log('Tool calls:', response.tool_calls);
}
```

### Aborting Requests

```typescript
import { llm } from './llmProvider';

const requestId = 'request-to-abort';

// Start a request
const promise = llm.askLLMText({
  messages: [{ role: 'user', content: 'Write a very long essay about quantum physics' }],
  requestId,
});

// Later, abort the request
setTimeout(() => {
  llm.abortRequest(requestId);
  console.log('Request aborted');
}, 1000);
```

## Available Models

To get a list of available providers and models:

```typescript
import { LLM } from './llmProvider';

console.log('Available providers:', LLM.getAvailableProviders());
console.log('Supported models:', LLM.getSupportedModels());
```

## Example

See `example.ts` for a complete example of using the unified LLM provider interface.

## Architecture

The unified LLM provider interface consists of:

- **LLM**: The main class that provides a unified interface for all providers
- **BaseProvider**: An abstract base class for all provider implementations
- **Provider implementations**: Concrete implementations for each LLM provider (OpenAI, Anthropic, etc.)
- **ProviderFactory**: A factory class for creating provider instances based on configuration

## Extending with New Providers

To add a new provider, create a new class that extends `BaseProvider` and implements the required methods. Then, update the `ProviderFactory` to include the new provider.

For example, to add a new provider called "NewProvider":

1. Create a new file `providers/NewProvider.ts` extending `BaseProvider`
2. Implement the required methods (`formatMessages`, `askLLMText`, `askTool`, `askLLMTextStream`)
3. Update `ProviderFactory.ts` to include the new provider
4. Update `.env` with any necessary environment variables for the new provider

## License

This module is part of the Open Agent project and is licensed under the same terms.
