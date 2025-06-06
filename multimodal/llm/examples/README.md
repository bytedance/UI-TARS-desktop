# LLM Examples

This guide provides an overview of the developer links and call methods for common models.

## Config API Key

```bash
export OPENAI_API_KEY=x
export ANTHROPIC_API_KEY=y
```

## LLM Providers

### OpenAI

| Type                  | URL                                                         |
| --------------------- | ----------------------------------------------------------- |
| GET API KEYS          | https://platform.openai.com/api-keys                        |
| API Documentation     | https://platform.openai.com/docs/api-reference/introduction |
| OpenAPI Specification | https://github.com/openai/openai-openapi                    |
| Github                | https://github.com/openai/openai-node                       |
| NPM                   | https://www.npmjs.com/openai-node                           |

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

const response = await client.responses.create({
  model: 'gpt-4o',
  instructions: 'You are a coding assistant that talks like a pirate',
  input: 'Are semicolons optional in JavaScript?',
});

console.log(response.output_text);
```

## Anthropic

## Gemini

| Type              | URL                                                                                |
| ----------------- | ---------------------------------------------------------------------------------- |
| GET API KEYS      | https://aistudio.google.com/apikey                                                 |
| API Documentation | https://ai.google.dev/gemini-api/docs                                              |
| NPM               | https://www.npmjs.com/package/@google/genai                                        |
| Models            | https://ai.google.dev/gemini-api/docs/models                                       |
| Quotas            | https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas |

```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Explain how AI works',
  });
  console.log(response.text);
}

await main();
```

> [!WARNING]
> What's the difference between these two packages?
>
> - [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai)
> - [@google/genai](https://www.npmjs.com/package/@google/genai)
>   See: https://github.com/googleapis/js-genai/issues/314

## OpenAI Compatibility

| Type      | URL                                                       |
| --------- | --------------------------------------------------------- |
| Gemini    | https://ai.google.dev/gemini-api/docs/openai              |
| Anthropic | https://docs.anthropic.com/en/api/openai-sdk              |
| Ollama    | https://github.com/ollama/ollama/blob/main/docs/openai.md |
| LM Studio | https://lmstudio.ai/docs/app/api/endpoints/openai         |
