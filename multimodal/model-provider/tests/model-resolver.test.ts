import { describe, it, expect, beforeEach } from 'vitest';
import { ModelResolver } from '../src/model-resolver';
import { ModelProvider, ModelProviderName } from '../src/types';
import { ModelDefaultSelection } from '../src/types';

describe('ModelResolver', () => {
  let testProviders: ModelProvider[];

  beforeEach(() => {
    testProviders = [
      {
        name: 'openai',
        models: ['gpt-4o', 'gpt-3.5-turbo'],
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-openai-key',
      },
      {
        name: 'anthropic',
        models: ['claude-3-haiku', 'claude-3-sonnet'],
        baseURL: 'https://api.anthropic.com',
        apiKey: 'test-anthropic-key',
      },
      {
        name: 'ollama',
        models: ['llama3', 'mistral'],
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'test-ollama-key',
      },
    ];
  });

  it('should initialize with default values when no options provided', () => {
    const resolver = new ModelResolver();
    const defaultSelection = resolver.getDefaultSelection();

    expect(defaultSelection).toEqual({});
    expect(resolver.getAllProviders()).toEqual([]);
  });

  it('should initialize with provided options', () => {
    const resolver = new ModelResolver({
      providers: testProviders,
    });

    expect(resolver.getAllProviders()).toEqual(testProviders);
    expect(resolver.getDefaultSelection()).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'test-openai-key',
    });
  });

  it('should use explicit default selection when provided', () => {
    const defaultSelection: ModelDefaultSelection = {
      provider: 'anthropic',
      model: 'claude-3-haiku',
    };

    const resolver = new ModelResolver({
      providers: testProviders,
      use: defaultSelection,
    });

    expect(resolver.getDefaultSelection()).toEqual(defaultSelection);
  });

  it('should resolve model using explicit run parameters', () => {
    const resolver = new ModelResolver({
      providers: testProviders,
    });

    const resolved = resolver.resolve('claude-3-sonnet', 'anthropic');

    expect(resolved).toEqual({
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-anthropic-key',
      actualProvider: 'anthropic',
    });
  });

  it('should infer provider when only model is specified', () => {
    const resolver = new ModelResolver({
      providers: testProviders,
    });

    const resolved = resolver.resolve('llama3');

    expect(resolved).toEqual({
      provider: 'ollama',
      model: 'llama3',
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'test-ollama-key',
      actualProvider: 'openai', // 'ollama' maps to 'openai' as actualProvider
    });
  });

  it('should use default selection when no run parameters provided', () => {
    const resolver = new ModelResolver({
      providers: testProviders,
      use: {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
      },
    });

    const resolved = resolver.resolve();

    expect(resolved).toEqual({
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-anthropic-key',
      actualProvider: 'anthropic',
    });
  });

  it('should default to openai when provider cannot be inferred', () => {
    const resolver = new ModelResolver({
      providers: testProviders,
    });

    const resolved = resolver.resolve('unknown-model');

    expect(resolved).toEqual({
      provider: 'openai',
      model: 'unknown-model',
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'test-openai-key',
      actualProvider: 'openai',
    });
  });

  it('should map providers to their actual implementations', () => {
    const resolver = new ModelResolver({
      providers: [
        {
          name: 'ollama',
          models: ['llama3'],
          baseURL: 'http://custom-ollama:11434/v1',
          apiKey: 'custom-key',
        },
      ],
    });

    const resolved = resolver.resolve('llama3');

    expect(resolved).toEqual({
      provider: 'ollama',
      model: 'llama3',
      baseURL: 'http://custom-ollama:11434/v1',
      apiKey: 'custom-key',
      actualProvider: 'openai', // 'ollama' maps to 'openai'
    });
  });

  // it('should throw error when no model can be resolved', () => {
  //   const resolver = new ModelResolver({
  //     providers: [],
  //   });

  //   expect(() => resolver.resolve(undefined, undefined)).toThrow(/Missing model configuration/);
  // });

  it('should apply default configuration from MODEL_PROVIDER_CONFIGS', () => {
    const resolver = new ModelResolver();

    const resolved = resolver.resolve('llama3', 'ollama');

    expect(resolved).toEqual({
      provider: 'ollama',
      model: 'llama3',
      baseURL: 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama',
      actualProvider: 'openai',
    });
  });

  it('should prioritize user-provided configuration over defaults', () => {
    const resolver = new ModelResolver({
      providers: [
        {
          name: 'ollama',
          models: ['llama3'],
          baseURL: 'http://custom-server:11434/v1',
          apiKey: 'custom-key',
        },
      ],
    });

    const resolved = resolver.resolve('llama3', 'ollama');

    expect(resolved).toEqual({
      provider: 'ollama',
      model: 'llama3',
      baseURL: 'http://custom-server:11434/v1',
      apiKey: 'custom-key',
      actualProvider: 'openai',
    });
  });

  it('should handle case with no providers configured', () => {
    const resolver = new ModelResolver();

    const resolved = resolver.resolve('gpt-4o', 'openai');

    expect(resolved).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
      baseURL: undefined,
      apiKey: undefined,
      actualProvider: 'openai',
    });
  });
});
