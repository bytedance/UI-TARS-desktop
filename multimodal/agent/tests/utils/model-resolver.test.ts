/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelResolver, AgentOptions } from './../../src';

describe('ModelResolver', () => {
  beforeEach(() => {
    // Clear environment variable effects
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Configuration', () => {
    // Start with the most basic scenario users will encounter
    it('should resolve to OpenAI defaults when no configuration is provided', () => {
      const resolver = new ModelResolver({});
      const resolved = resolver.resolve();

      expect(resolved.provider).toBe('openai');
      expect(resolved.model).toBe('gpt-4o');
      expect(resolved.actualProvider).toBe('openai');
    });

    // Next, show the simplest customization with model.use
    it('should respect basic model.use configuration', () => {
      const options: AgentOptions = {
        model: {
          use: {
            provider: 'openai',
            model: 'gpt-4.5-preview',
          },
        },
      };

      const resolver = new ModelResolver(options);
      const resolved = resolver.resolve();

      expect(resolved.provider).toBe('openai');
      expect(resolved.model).toBe('gpt-4.5-preview');
      expect(resolved.actualProvider).toBe('openai');
    });

    // Error case for incomplete configuration
    it('should throw error when only provider is specified without model', () => {
      const options: AgentOptions = {
        model: {
          use: {
            provider: 'openai',
            // No model specified
          },
        },
      };

      const resolver = new ModelResolver(options);
      expect(() => resolver.resolve()).toThrow('[Config] Missing model configuration');
    });
  });

  describe('Advanced Configuration', () => {
    // Model.use with custom API settings
    it('should apply custom API settings from model.use', () => {
      const options: AgentOptions = {
        model: {
          use: {
            provider: 'azure-openai',
            model: 'aws_sdk_claude37_sonnet',
            baseURL: 'https://test-url.com',
            apiKey: 'test-key',
          },
        },
      };

      const resolver = new ModelResolver(options);
      const resolved = resolver.resolve();

      expect(resolved.provider).toBe('azure-openai');
      expect(resolved.model).toBe('aws_sdk_claude37_sonnet');
      expect(resolved.baseURL).toBe('https://test-url.com');
      expect(resolved.apiKey).toBe('test-key');
      expect(resolved.actualProvider).toBe('azure-openai');
    });

    // Using providers array
    it('should infer defaults from first provider in providers array', () => {
      const options: AgentOptions = {
        model: {
          providers: [
            {
              name: 'anthropic',
              baseURL: 'https://anthropic-api.com',
              apiKey: 'anthropic-key',
              models: ['claude-3-7-sonnet-latest'],
            },
          ],
        },
      };

      const resolver = new ModelResolver(options);
      const resolved = resolver.resolve();

      expect(resolved.provider).toBe('anthropic');
      expect(resolved.model).toBe('claude-3-7-sonnet-latest');
      expect(resolved.baseURL).toBe('https://anthropic-api.com');
      expect(resolved.apiKey).toBe('anthropic-key');
      expect(resolved.actualProvider).toBe('anthropic');
    });

    // Override at runtime with explicit model
    it('should prioritize run-time model over defaults', () => {
      const options: AgentOptions = {
        model: {
          use: {
            provider: 'openai',
            model: 'gpt-4o',
          },
        },
      };

      const resolver = new ModelResolver(options);
      const resolved = resolver.resolve('gpt-4.5-preview', 'openai');

      expect(resolved.provider).toBe('openai');
      expect(resolved.model).toBe('gpt-4.5-preview');
      expect(resolved.actualProvider).toBe('openai');
    });
  });

  describe('Special Providers', () => {
    // Test default configurations for special providers
    it('should apply default configurations for special providers', () => {
      const resolver = new ModelResolver({});

      // Test Ollama
      const ollamaResolved = resolver.resolve('llama3', 'ollama');
      expect(ollamaResolved.provider).toBe('ollama');
      expect(ollamaResolved.model).toBe('llama3');
      expect(ollamaResolved.baseURL).toBe('http://127.0.0.1:11434/v1');
      expect(ollamaResolved.apiKey).toBe('ollama');
      expect(ollamaResolved.actualProvider).toBe('openai');

      // Test LM Studio
      const lmStudioResolved = resolver.resolve('qwen3:1.7b', 'lm-studio');
      expect(lmStudioResolved.provider).toBe('lm-studio');
      expect(lmStudioResolved.model).toBe('qwen3:1.7b');
      expect(lmStudioResolved.baseURL).toBe('http://127.0.0.1:1234/v1');
      expect(lmStudioResolved.apiKey).toBe('lm-studio');
      expect(lmStudioResolved.actualProvider).toBe('openai');

      // Test Volcengine
      const vcResolved = resolver.resolve('doubao-model', 'volcengine');
      expect(vcResolved.provider).toBe('volcengine');
      expect(vcResolved.model).toBe('doubao-model');
      expect(vcResolved.baseURL).toBe('https://ark.cn-beijing.volces.com/api/v3');
      expect(vcResolved.actualProvider).toBe('openai');
    });

    it('should override default provider configs with custom values', () => {
      const customBaseURL = 'https://my-custom-api.com';
      const customApiKey = 'my-custom-key';

      const options: AgentOptions = {
        model: {
          use: {
            provider: 'volcengine',
            model: 'custom-model',
            baseURL: customBaseURL,
            apiKey: customApiKey,
          },
        },
      };

      const resolver = new ModelResolver(options);
      const resolved = resolver.resolve();

      // Should use custom values instead of defaults
      expect(resolved.provider).toBe('volcengine');
      expect(resolved.model).toBe('custom-model');
      expect(resolved.baseURL).toBe(customBaseURL);
      expect(resolved.apiKey).toBe(customApiKey);
      expect(resolved.actualProvider).toBe('openai');
    });
  });

  describe('Model and Provider Resolution', () => {
    // Test finding provider from providers array for a given model
    it('should find provider for a given model from providers array', () => {
      const options: AgentOptions = {
        model: {
          providers: [
            {
              name: 'openai',
              models: ['gpt-4o', 'gpt-4-turbo'],
            },
            {
              name: 'anthropic',
              models: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet'],
            },
          ],
        },
      };

      const resolver = new ModelResolver(options);

      // Should find the correct provider when only model is specified
      const resolved = resolver.resolve('claude-3-7-sonnet-latest');

      expect(resolved.provider).toBe('anthropic');
      expect(resolved.model).toBe('claude-3-7-sonnet-latest');
      expect(resolved.actualProvider).toBe('anthropic');
    });

    it('should normalize and return all providers', () => {
      const options: AgentOptions = {
        model: {
          providers: [
            {
              name: 'openai',
              models: ['gpt-4o'],
            },
            {
              name: 'ollama', // This will be normalized
              models: ['llama3'],
            },
          ],
        },
      };

      const resolver = new ModelResolver(options);
      const allProviders = resolver.getAllProviders();

      expect(allProviders).toHaveLength(2);

      // Check if ollama is normalized
      const ollama = allProviders.find((p) => p.name === 'openai' && p.baseURL?.includes('11434'));
      expect(ollama).toBeDefined();
      expect(ollama?.baseURL).toBe('http://127.0.0.1:11434/v1');
    });

    it('should return correct default selection', () => {
      const customApiKey = 'custom-api-key';
      const options: AgentOptions = {
        model: {
          use: {
            provider: 'deepseek',
            model: 'deepseek-reasoner',
            apiKey: customApiKey,
          },
        },
      };

      const resolver = new ModelResolver(options);
      const defaultSelection = resolver.getDefaultSelection();

      expect(defaultSelection.provider).toBe('deepseek');
      expect(defaultSelection.model).toBe('deepseek-reasoner');
      expect(defaultSelection.apiKey).toBe(customApiKey);
    });
  });
});
