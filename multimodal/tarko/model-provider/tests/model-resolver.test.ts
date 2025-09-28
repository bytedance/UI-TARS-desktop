/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { resolveModel } from '../src/model-resolver';
import { AgentModel } from '../src/types';

describe('resolveModel', () => {
  it('should use default values when no parameters provided', () => {
    const result = resolveModel();

    expect(result).toEqual({
      provider: 'openai',
      id: 'gpt-4o',
      displayName: undefined,
      baseURL: undefined,
      apiKey: undefined,
      headers: {},
      params: undefined,
      baseProvider: 'openai',
    });
  });

  it('should use agent model configuration', () => {
    const agentModel: AgentModel = {
      provider: 'anthropic',
      id: 'claude-3-5-sonnet-20241022',
      displayName: 'Claude 3.5 Sonnet',
      apiKey: 'test-key',
      baseURL: 'https://api.anthropic.com',
    };

    const result = resolveModel(agentModel);

    expect(result).toEqual({
      provider: 'anthropic',
      id: 'claude-3-5-sonnet-20241022',
      displayName: 'Claude 3.5 Sonnet',
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-key',
      headers: {
        'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19',
      },
      params: undefined,
      baseProvider: 'anthropic',
    });
  });

  it('should override with runtime parameters', () => {
    const agentModel: AgentModel = {
      provider: 'openai',
      id: 'gpt-4',
      apiKey: 'original-key',
    };

    const result = resolveModel(agentModel, 'gpt-4o-mini', 'anthropic');

    expect(result).toEqual({
      provider: 'anthropic',
      id: 'gpt-4o-mini',
      displayName: undefined,
      baseURL: undefined,
      apiKey: 'original-key',
      headers: {},
      params: undefined,
      baseProvider: 'anthropic',
    });
  });

  it('should apply default configuration for extended providers', () => {
    const result = resolveModel(undefined, 'llama3.2', 'ollama');

    expect(result).toEqual({
      provider: 'ollama',
      id: 'llama3.2',
      displayName: undefined,
      baseURL: 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama',
      headers: {},
      params: undefined,
      baseProvider: 'openai',
    });
  });

  it('should preserve agent model values over defaults', () => {
    const agentModel: AgentModel = {
      provider: 'ollama',
      id: 'custom-model',
      baseURL: 'http://custom-host:8080/v1',
      apiKey: 'custom-key',
    };

    const result = resolveModel(agentModel);

    expect(result).toEqual({
      provider: 'ollama',
      id: 'custom-model',
      displayName: undefined,
      baseURL: 'http://custom-host:8080/v1',
      apiKey: 'custom-key',
      headers: {},
      params: undefined,
      baseProvider: 'openai',
    });
  });

  it('should handle volcengine provider correctly', () => {
    const result = resolveModel(undefined, 'doubao-pro-4k', 'volcengine');

    expect(result).toEqual({
      provider: 'volcengine',
      id: 'doubao-pro-4k',
      displayName: undefined,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      apiKey: undefined,
      headers: {},
      params: undefined,
      baseProvider: 'openai',
    });
  });

  it('should handle deepseek provider correctly', () => {
    const agentModel: AgentModel = {
      provider: 'deepseek',
      id: 'deepseek-chat',
      apiKey: 'deepseek-key',
    };

    const result = resolveModel(agentModel);

    expect(result).toEqual({
      provider: 'deepseek',
      id: 'deepseek-chat',
      displayName: undefined,
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: 'deepseek-key',
      headers: {},
      params: undefined,
      baseProvider: 'openai',
    });
  });

  it('should add anthropic_beta params for azure-openai provider with gcp-claude4-sonnet model', () => {
    const agentModel: AgentModel = {
      provider: 'azure-openai',
      id: 'gcp-claude4-sonnet',
      apiKey: 'azure-key',
    };

    const result = resolveModel(agentModel);

    expect(result).toEqual({
      provider: 'azure-openai',
      id: 'gcp-claude4-sonnet',
      displayName: undefined,
      baseURL: undefined,
      apiKey: 'azure-key',
      headers: {},
      params: {
        anthropic_beta: ['fine-grained-tool-streaming-2025-05-14'],
      },
      baseProvider: 'azure-openai',
    });
  });
});
