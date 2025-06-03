import { describe, it, expect, vi } from 'vitest';
import { ModelResolver } from '../src/model-resolver';
import { createLLMClient } from '../src/llm-client';

vi.mock('@multimodal/llm-client', () => {
  return {
    TokenJS: vi.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: vi
              .fn()
              .mockResolvedValue({ choices: [{ message: { content: 'Test response' } }] }),
          },
        },
        extendModelList: vi.fn(),
      };
    }),
  };
});

describe('Integration between ModelResolver and LLM Client', () => {
  it('should create a working LLM client from resolved model', async () => {
    const resolver = new ModelResolver({
      providers: [
        {
          name: 'openai',
          models: ['gpt-4o'],
          baseURL: 'https://api.openai.com/v1',
          apiKey: 'test-api-key',
        },
      ],
    });

    const resolvedModel = resolver.resolve();
    const client = createLLMClient(resolvedModel);

    const response = await client.chat.completions.create({
      model: resolvedModel.model,
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(response).toHaveProperty('choices');
  });
});
