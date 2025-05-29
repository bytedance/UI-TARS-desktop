# @agent-infra/llm (WIP)

A TypeScript SDK to call multiple LLM Prividers in OpenAI format.

## Installation

```bash
pnpm install @agent-infra/llm
```

## Quick Start

### Create a OpenAI provider

```ts
import { LLMClient } from '@agent-infra/llm';

const client = new LLMClient('openai', {
  apiKey: '',
  baseUrl: '',
});

const result = await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Say this is a test' }],
  model: 'gpt-4o',
});
```

## Features

### Create different providers

```ts
import { LLMClient } from '@agent-infra/llm';

const client = new LLMClient('openrouter', {
  apiKey: '',
  baseUrl: '',
});

const result = await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Say this is a test' }],
  model: 'openai/gpt-4o',
});
```

## Create a Anthropic provider

```ts
import { LLMClient } from '@agent-infra/llm';

const client = new LLMClient('anthropic', {
  apiKey: '',
  baseUrl: '',
});

const result = await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Say this is a test' }],
  model: 'openai/gpt-4o',
});
```
