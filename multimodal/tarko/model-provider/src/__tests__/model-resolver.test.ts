/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { resolveModel } from '../model-resolver';
import { AgentModel } from '../types';

describe('model-resolver', () => {
  describe('resolveModel', () => {
    it('should automatically add Claude headers for Claude models', () => {
      const result = resolveModel(
        undefined,
        'claude-3-sonnet',
        'anthropic'
      );
      
      expect(result.headers?.['anthropic-beta']).toBe(
        'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
      );
    });

    it('should not add Claude headers for non-Claude models', () => {
      const result = resolveModel(
        undefined,
        'gpt-4',
        'openai'
      );
      
      expect(result.headers?.['anthropic-beta']).toBeUndefined();
    });

    it('should merge Claude headers with existing headers', () => {
      const agentModel: AgentModel = {
        id: 'claude-3-sonnet',
        provider: 'anthropic',
        headers: { 'X-Custom': 'value' }
      };
      
      const result = resolveModel(agentModel);
      
      expect(result.headers?.['X-Custom']).toBe('value');
      expect(result.headers?.['anthropic-beta']).toBe(
        'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
      );
    });

    it('should preserve existing headers for non-Claude models', () => {
      const agentModel: AgentModel = {
        id: 'gpt-4',
        provider: 'openai',
        headers: { 'X-Custom': 'value' }
      };
      
      const result = resolveModel(agentModel);
      
      expect(result.headers?.['X-Custom']).toBe('value');
      expect(result.headers?.['anthropic-beta']).toBeUndefined();
    });
  });
});
