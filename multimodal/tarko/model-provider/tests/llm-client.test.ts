/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLLMClient } from '../src/llm-client';
import { AgentModel } from '../src/types';
import { TokenJS } from '@tarko/llm-client';

// Mock TokenJS
vi.mock('@tarko/llm-client', () => ({
  TokenJS: vi.fn(),
}));

describe('createLLMClient', () => {
  let mockTokenJSInstance: any;
  let mockTokenJSConstructor: any;

  beforeEach(() => {
    mockTokenJSInstance = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
      extendModelList: vi.fn(),
    };

    mockTokenJSConstructor = vi.mocked(TokenJS).mockImplementation(() => mockTokenJSInstance);
  });

  it('should create TokenJS instance with correct configuration', () => {
    const model: AgentModel = {
      provider: 'openai',
      id: 'gpt-4o',
      apiKey: 'test-key',
      baseURL: 'https://api.openai.com/v1',
    };

    createLLMClient(model);

    expect(mockTokenJSConstructor).toHaveBeenCalledWith({
      apiKey: 'test-key',
      baseURL: 'https://api.openai.com/v1',
    });
  });

  it('should not extend model list for native providers', () => {
    const model: AgentModel = {
      provider: 'openrouter',
      id: 'gpt-4o',
      baseProvider: 'openrouter',
    };

    createLLMClient(model);

    expect(mockTokenJSInstance.extendModelList).not.toHaveBeenCalled();
  });

  it('should extend model list for non-native providers', () => {
    const model: AgentModel = {
      provider: 'volcengine',
      id: 'ep-20250613182556-7z8pl',
      baseProvider: 'openai',
    };

    createLLMClient(model);

    expect(mockTokenJSInstance.extendModelList).toHaveBeenCalledWith(
      'openai',
      'ep-20250613182556-7z8pl',
      {
        streaming: true,
        json: true,
        toolCalls: true,
        images: true,
      },
    );
  });

  it('should extend model list for openai-based providers like volcengine', () => {
    const model: AgentModel = {
      provider: 'volcengine',
      id: 'ep-20250613182556-7z8pl',
      baseProvider: 'openai',
    };

    createLLMClient(model);

    expect(mockTokenJSInstance.extendModelList).toHaveBeenCalledWith(
      'openai',
      'ep-20250613182556-7z8pl',
      {
        streaming: true,
        json: true,
        toolCalls: true,
        images: true,
      },
    );
  });

  it('should extend model list for anthropic-based providers', () => {
    const model: AgentModel = {
      provider: 'custom-anthropic',
      id: 'custom-claude',
      baseProvider: 'anthropic',
    };

    createLLMClient(model);

    expect(mockTokenJSInstance.extendModelList).toHaveBeenCalledWith(
      'anthropic',
      'custom-claude',
      {
        streaming: true,
        json: true,
        toolCalls: true,
        images: true,
      },
    );
  });

  it('should handle missing extendModelList method gracefully', () => {
    const modelWithoutExtend = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
      // No extendModelList method
    };

    mockTokenJSConstructor.mockImplementation(() => modelWithoutExtend);

    const model: AgentModel = {
      provider: 'ollama',
      id: 'llama3.2',
      baseProvider: 'custom-provider' as any,
    };

    expect(() => createLLMClient(model)).not.toThrow();
  });

  it('should create OpenAI-compatible interface', async () => {
    const model: AgentModel = {
      provider: 'anthropic',
      id: 'claude-3-5-sonnet-20241022',
      baseProvider: 'anthropic',
    };

    const mockResponse = { id: 'test-response' };
    mockTokenJSInstance.chat.completions.create.mockResolvedValue(mockResponse);

    const client = createLLMClient(model);
    const params = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };

    const result = await client.chat.completions.create(params);

    expect(mockTokenJSInstance.chat.completions.create).toHaveBeenCalledWith({
      ...params,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
    });
    expect(result).toBe(mockResponse);
  });

  it('should apply request interceptor when provided', async () => {
    const model: AgentModel = {
      provider: 'openai',
      id: 'gpt-4o',
      baseProvider: 'openai',
      baseURL: 'https://api.openai.com/v1',
    };

    const interceptor = vi.fn((provider, request, baseURL) => ({
      ...request,
      temperature: 0.5,
      intercepted: true,
    }));

    const mockResponse = { id: 'test-response' };
    mockTokenJSInstance.chat.completions.create.mockResolvedValue(mockResponse);

    const client = createLLMClient(model, interceptor);
    const params = {
      model: 'gpt-4o',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };

    await client.chat.completions.create(params);

    expect(interceptor).toHaveBeenCalledWith(
      'openai',
      {
        ...params,
        provider: 'openai',
        model: 'gpt-4o',
      },
      'https://api.openai.com/v1',
    );

    expect(mockTokenJSInstance.chat.completions.create).toHaveBeenCalledWith({
      ...params,
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.5,
      intercepted: true,
    });
  });

  it('should handle undefined baseURL and apiKey', () => {
    const model: AgentModel = {
      provider: 'openai',
      id: 'gpt-4o',
    };

    createLLMClient(model);

    expect(mockTokenJSConstructor).toHaveBeenCalledWith({
      apiKey: undefined,
      baseURL: undefined,
    });
  });
});
