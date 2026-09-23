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

  describe('addClaudeHeadersIfNeeded with a caller-provided anthropic-beta', () => {
    const DEFAULTS = 'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19';

    it('should keep a beta flag the caller requested', () => {
      const result = addClaudeHeadersIfNeeded('claude-sonnet-4-5', {
        'anthropic-beta': 'context-1m-2025-04-11',
      });
      expect(result['anthropic-beta']).toBe(`${DEFAULTS},context-1m-2025-04-11`);
    });

    it('should send a single beta header when the caller used another case', () => {
      const result = addClaudeHeadersIfNeeded('claude-sonnet-4-5', {
        'Anthropic-Beta': 'prompt-caching-scope-2026-01-05',
      });
      const betaKeys = Object.keys(result).filter((key) => key.toLowerCase() === 'anthropic-beta');
      expect(betaKeys).toEqual(['Anthropic-Beta']);
      expect(result['Anthropic-Beta']).toBe(`${DEFAULTS},prompt-caching-scope-2026-01-05`);
    });

    it('should not repeat a flag the caller already listed', () => {
      const result = addClaudeHeadersIfNeeded('claude-3-5-sonnet-20241022', {
        'anthropic-beta': 'token-efficient-tools-2025-02-19,my-own-2026-01-01',
      });
      expect(result['anthropic-beta']).toBe(`${DEFAULTS},my-own-2026-01-01`);
    });

    it('should trim padded lists and drop empty entries', () => {
      const result = addClaudeHeadersIfNeeded('claude-3-haiku', {
        'anthropic-beta': ' flag-a ,  ,, flag-b ',
      });
      expect(result['anthropic-beta']).toBe(`${DEFAULTS},flag-a,flag-b`);
    });

    it('should not modify the header object it was given', () => {
      const headers = { 'anthropic-beta': 'context-1m-2025-04-11', 'X-Custom': 'v' };
      const result = addClaudeHeadersIfNeeded('claude-sonnet-4-5', headers);
      expect(headers['anthropic-beta']).toBe('context-1m-2025-04-11');
      expect(result).not.toBe(headers);
    });

    it('should leave the default list unchanged when the caller set nothing usable', () => {
      expect(addClaudeHeadersIfNeeded('claude-3-haiku')).toEqual(getClaudeHeaders());
      expect(addClaudeHeadersIfNeeded('claude-3-haiku', {})).toEqual(getClaudeHeaders());
      expect(addClaudeHeadersIfNeeded('claude-3-haiku', { 'anthropic-beta': '' })).toEqual(
        getClaudeHeaders(),
      );
    });

    it('should leave a non-Claude model request untouched', () => {
      const headers = { 'anthropic-beta': 'context-1m-2025-04-11' };
      expect(addClaudeHeadersIfNeeded('gpt-4', headers)).toEqual(headers);
    });
  });
});
