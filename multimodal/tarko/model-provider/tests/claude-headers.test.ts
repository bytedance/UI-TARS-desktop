/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { isClaudeModel, getClaudeHeaders, addClaudeHeadersIfNeeded } from '../src/claude-headers';

describe('claude-headers', () => {
  describe('isClaudeModel', () => {
    it('should detect Claude models correctly', () => {
      expect(isClaudeModel('claude-3-sonnet')).toBe(true);
      expect(isClaudeModel('claude-3-5-sonnet-20241022')).toBe(true);
      expect(isClaudeModel('anthropic/claude-3-haiku')).toBe(true);
      expect(isClaudeModel('gcp-claude4-sonnet')).toBe(false);
      expect(isClaudeModel('azure-claude-instant')).toBe(false);
      expect(isClaudeModel('gpt-4')).toBe(false);
      expect(isClaudeModel('gemini-pro')).toBe(false);
    });
  });

  describe('getClaudeHeaders', () => {
    it('should return correct anthropic-beta headers', () => {
      const headers = getClaudeHeaders();
      expect(headers['anthropic-beta']).toBe(
        'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
      );
    });
  });

  describe('addClaudeHeadersIfNeeded', () => {
    it('should add Claude headers for Claude models', () => {
      const result = addClaudeHeadersIfNeeded('claude-3-sonnet');
      expect(result['anthropic-beta']).toBe(
        'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
      );
    });

    it('should not add Claude headers for non-Claude models', () => {
      const result = addClaudeHeadersIfNeeded('gpt-4');
      expect(result['anthropic-beta']).toBeUndefined();
    });

    it('should merge with existing headers', () => {
      const existingHeaders = { 'X-Custom': 'value' };
      const result = addClaudeHeadersIfNeeded('claude-3-sonnet', existingHeaders);
      expect(result['X-Custom']).toBe('value');
      expect(result['anthropic-beta']).toBe(
        'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19'
      );
    });

    it('should preserve existing headers for non-Claude models', () => {
      const existingHeaders = { 'X-Custom': 'value' };
      const result = addClaudeHeadersIfNeeded('gpt-4', existingHeaders);
      expect(result['X-Custom']).toBe('value');
      expect(result['anthropic-beta']).toBeUndefined();
    });
  });
});
