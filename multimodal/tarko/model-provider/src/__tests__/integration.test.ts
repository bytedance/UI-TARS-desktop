/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { resolveModel } from '../index';

describe('Claude Headers Integration', () => {
  it('should automatically add Claude headers when resolving Claude models', () => {
    // Test with Claude model
    const claudeModel = resolveModel(
      undefined,
      'claude-3-sonnet',
      'anthropic'
    );
    
    expect(claudeModel.headers?.['anthropic-beta']).toBe(
      'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
    );
  });

  it('should not add Claude headers for non-Claude models', () => {
    // Test with non-Claude model
    const openaiModel = resolveModel(
      undefined,
      'gpt-4',
      'openai'
    );
    
    expect(openaiModel.headers?.['anthropic-beta']).toBeUndefined();
  });

  it('should merge Claude headers with existing custom headers', () => {
    const customModel = resolveModel({
      id: 'claude-3-haiku',
      provider: 'anthropic',
      headers: {
        'X-Custom': 'value',
        'Authorization': 'Bearer token'
      }
    });
    
    expect(customModel.headers?.['X-Custom']).toBe('value');
    expect(customModel.headers?.['Authorization']).toBe('Bearer token');
    expect(customModel.headers?.['anthropic-beta']).toBe(
      'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
    );
  });

  it('should detect various Claude model patterns', () => {
    const models = [
      'claude-3-sonnet',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku',
      'anthropic/claude-3-opus'
    ];
    
    models.forEach(modelId => {
      const model = resolveModel(undefined, modelId, 'anthropic');
      expect(model.headers?.['anthropic-beta']).toBe(
        'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
      );
    });
  });

  it('should not affect non-Claude models on anthropic provider', () => {
    const model = resolveModel(undefined, 'some-other-model', 'anthropic');
    expect(model.headers?.['anthropic-beta']).toBeUndefined();
  });
});
