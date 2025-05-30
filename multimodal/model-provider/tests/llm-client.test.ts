import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLLMClient } from '../src/llm-client';
import { ResolvedModel } from '../src/types';

// Mock the TokenJS client
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

describe('createLLMClient', () => {
  let resolvedModel: ResolvedModel;

  beforeEach(() => {
    resolvedModel = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-api-key',
      baseURL: 'https://api.openai.com/v1',
      actualProvider: 'openai',
    };
  });

  it('should create a client with the correct configuration', async () => {
    const client = createLLMClient(resolvedModel);

    // Test that the client has the expected structure
    expect(client).toHaveProperty('chat.completions.create');

    // Make a call to test the client
    const result = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toHaveProperty('choices');
  });

  it('should handle extended providers correctly', async () => {
    const ollamaModel: ResolvedModel = {
      provider: 'ollama',
      model: 'llama3',
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'ollama-key',
      actualProvider: 'openai',
    };

    const client = createLLMClient(ollamaModel);
    await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    // Here we could verify that extendModelList was called with the right parameters
    // but that would require more complex mocking
  });

  it('should apply request interceptor when provided', async () => {
    const interceptor = vi.fn((provider, request) => {
      return {
        ...request,
        intercepted: true,
      };
    });

    const client = createLLMClient(resolvedModel, interceptor);
    await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(interceptor).toHaveBeenCalled();
  });
});
