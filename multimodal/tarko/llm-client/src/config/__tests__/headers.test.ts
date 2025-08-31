/**
 * Tests for header configuration system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HeaderConfigRegistry,
  ClaudeModelDetector,
  initializeDefaultConfigs,
  type ProviderHeaderConfig,
} from '../headers.js';

describe('HeaderConfigRegistry', () => {
  beforeEach(() => {
    // Reset registry before each test
    (HeaderConfigRegistry as any).configs = {};
  });

  it('should register and retrieve provider configurations', () => {
    const config: ProviderHeaderConfig = {
      static: { 'X-Test': 'value' },
    };

    HeaderConfigRegistry.register('openai', config);
    expect(HeaderConfigRegistry.get('openai')).toBe(config);
  });

  it('should generate headers correctly', () => {
    const config: ProviderHeaderConfig = {
      static: { 'X-Static': 'static-value' },
      dynamic: (model) => ({ 'X-Model': model }),
      conditional: (params) => params.test ? { 'X-Test': 'conditional' } : {},
    };

    HeaderConfigRegistry.register('openai', config);

    const headers = HeaderConfigRegistry.generateHeaders(
      'openai',
      'gpt-4',
      { test: true }
    );

    expect(headers).toEqual({
      'X-Static': 'static-value',
      'X-Model': 'gpt-4',
      'X-Test': 'conditional',
    });
  });

  it('should return empty headers for unregistered providers', () => {
    const headers = HeaderConfigRegistry.generateHeaders('openai', 'gpt-4');
    expect(headers).toEqual({});
  });
});

describe('ClaudeModelDetector', () => {
  it('should detect Claude models correctly', () => {
    expect(ClaudeModelDetector.isClaudeModel('claude-3-sonnet')).toBe(true);
    expect(ClaudeModelDetector.isClaudeModel('claude-3-5-sonnet-20241022')).toBe(true);
    expect(ClaudeModelDetector.isClaudeModel('anthropic/claude-3-haiku')).toBe(true);
    expect(ClaudeModelDetector.isClaudeModel('gpt-4')).toBe(false);
    expect(ClaudeModelDetector.isClaudeModel('gemini-pro')).toBe(false);
  });

  it('should return correct beta features', () => {
    const features = ClaudeModelDetector.getClaudeBetaFeatures();
    expect(features).toContain('fine-grained-tool-streaming-2025-05-14');
    expect(features).toContain('token-efficient-tools-2025-02-19');
  });
});

describe('initializeDefaultConfigs', () => {
  beforeEach(() => {
    (HeaderConfigRegistry as any).configs = {};
  });

  it('should initialize Anthropic configuration', () => {
    initializeDefaultConfigs();
    
    const config = HeaderConfigRegistry.get('anthropic');
    expect(config).toBeDefined();
    expect(config?.dynamic).toBeDefined();
    expect(config?.conditional).toBeDefined();
  });

  it('should generate anthropic-beta header for Claude models', () => {
    initializeDefaultConfigs();
    
    const headers = HeaderConfigRegistry.generateHeaders(
      'anthropic',
      'claude-3-sonnet'
    );
    
    expect(headers['anthropic-beta']).toBe(
      'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
    );
  });

  it('should not generate anthropic-beta header for non-Claude models', () => {
    initializeDefaultConfigs();
    
    const headers = HeaderConfigRegistry.generateHeaders(
      'anthropic',
      'some-other-model'
    );
    
    expect(headers['anthropic-beta']).toBeUndefined();
  });

  it('should add conditional headers for tool calls', () => {
    initializeDefaultConfigs();
    
    const headers = HeaderConfigRegistry.generateHeaders(
      'anthropic',
      'claude-3-sonnet',
      { tools: [{ function: { name: 'test' } }], model: 'claude-3-sonnet' }
    );
    
    expect(headers['anthropic-beta']).toContain('fine-grained-tool-streaming');
    expect(headers['anthropic-beta']).toContain('token-efficient-tools');
  });
});
