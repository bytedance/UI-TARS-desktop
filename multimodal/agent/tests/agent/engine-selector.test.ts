/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { getToolCallEngineForProvider } from '../../src/tool-call-engine/engine-selector';

describe('ProviderEngineSelector', () => {
  describe('getToolCallEngineForProvider', () => {
    it('should return structured_outputs for volcengine', () => {
      expect(getToolCallEngineForProvider('volcengine')).toBe('structured_outputs');
    });

    it('should return native for OpenAI providers', () => {
      expect(getToolCallEngineForProvider('openai')).toBe('native');
      expect(getToolCallEngineForProvider('azure-openai')).toBe('native');
    });

    it('should return native for Anthropic', () => {
      expect(getToolCallEngineForProvider('anthropic')).toBe('native');
    });

    it('should return native for unknown providers', () => {
      expect(getToolCallEngineForProvider('unknown-provider')).toBe('native');
      expect(getToolCallEngineForProvider('some-new-provider')).toBe('native');
      expect(getToolCallEngineForProvider('custom')).toBe('native');
    });

    it('should return native for undefined or empty provider', () => {
      expect(getToolCallEngineForProvider(undefined)).toBe('native');
      expect(getToolCallEngineForProvider('')).toBe('native');
    });
  });
});
