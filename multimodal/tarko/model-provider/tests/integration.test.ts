/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { resolveModel, createLLMClient, HIGH_LEVEL_MODEL_PROVIDER_CONFIGS } from '../src/index';
import { AgentModel, ModelProviderName } from '../src/types';

describe('Integration Tests', () => {
  describe('resolveModel + createLLMClient workflow', () => {
    it('should work with default OpenAI configuration', () => {
      const resolved = resolveModel();
      expect(() => createLLMClient(resolved)).not.toThrow();

      expect(resolved.provider).toBe('openai');
      expect(resolved.id).toBe('gpt-4o');
      expect(resolved.baseProvider).toBe('openai');
    });

    it('should work with Ollama configuration', () => {
      const agentModel: AgentModel = {
        provider: 'ollama',
        id: 'llama3.2',
      };

      const resolved = resolveModel(agentModel);
      expect(() => createLLMClient(resolved)).not.toThrow();

      expect(resolved.provider).toBe('ollama');
      expect(resolved.baseURL).toBe('http://127.0.0.1:11434/v1');
      expect(resolved.apiKey).toBe('ollama');
      expect(resolved.baseProvider).toBe('openai');
    });

    it('should work with runtime overrides', () => {
      const agentModel: AgentModel = {
        provider: 'openai',
        id: 'gpt-4',
        apiKey: 'original-key',
      };

      const resolved = resolveModel(agentModel, 'llama3.2', 'ollama');
      expect(() => createLLMClient(resolved)).not.toThrow();

      expect(resolved.provider).toBe('ollama');
      expect(resolved.id).toBe('llama3.2');
      expect(resolved.apiKey).toBe('original-key'); // Preserved from agent model
      expect(resolved.baseURL).toBe('http://127.0.0.1:11434/v1'); // From default config
    });
  });

  describe('Provider configurations', () => {
    it('should have all expected provider configurations', () => {
      const expectedProviders: ModelProviderName[] = [
        'ollama',
        'lm-studio',
        'volcengine',
        'deepseek',
      ];

      expectedProviders.forEach((provider) => {
        const config = HIGH_LEVEL_MODEL_PROVIDER_CONFIGS.find((c) => c.name === provider);
        expect(config).toBeDefined();
        expect(config?.extends).toBeDefined();
      });
    });

    it('should resolve all configured providers correctly', () => {
      HIGH_LEVEL_MODEL_PROVIDER_CONFIGS.forEach((config) => {
        const resolved = resolveModel(undefined, 'test-model', config.name);

        expect(resolved.provider).toBe(config.name);
        expect(resolved.baseProvider).toBe(config.extends);
        expect(resolved.baseURL).toBe(config.baseURL);

        if (config.apiKey) {
          expect(resolved.apiKey).toBe(config.apiKey);
        }
      });
    });
  });

  describe('Type exports', () => {
    it('should export all necessary types and functions', () => {
      // Test that main exports are available
      expect(resolveModel).toBeDefined();
      expect(createLLMClient).toBeDefined();
      expect(HIGH_LEVEL_MODEL_PROVIDER_CONFIGS).toBeDefined();
    });

    it('should have correct provider configurations structure', () => {
      HIGH_LEVEL_MODEL_PROVIDER_CONFIGS.forEach((config) => {
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('extends');
        expect(typeof config.name).toBe('string');
        expect(typeof config.extends).toBe('string');

        if (config.baseURL) {
          expect(typeof config.baseURL).toBe('string');
          expect(config.baseURL).toMatch(/^https?:\/\//); // Should be a valid URL
        }

        if (config.apiKey) {
          expect(typeof config.apiKey).toBe('string');
        }
      });
    });
  });

  describe('Error handling', () => {
    it('should handle invalid provider gracefully', () => {
      // TypeScript should prevent this, but test runtime behavior
      const resolved = resolveModel(
        undefined,
        'test-model',
        'invalid-provider' as ModelProviderName,
      );

      expect(resolved.provider).toBe('invalid-provider');
      expect(resolved.baseProvider).toBe('invalid-provider'); // Falls back to same name
      expect(resolved.baseURL).toBeUndefined();
      expect(resolved.apiKey).toBeUndefined();
    });

    it('should create client even with minimal configuration', () => {
      const minimal: AgentModel = {
        provider: 'openai',
        id: 'gpt-4o',
      };

      expect(() => createLLMClient(minimal)).not.toThrow();
    });
  });
});
