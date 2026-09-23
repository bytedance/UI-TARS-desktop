/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { addAzureClaudeParamsIfNeeded } from '../src/azure-claude-params';

const FINE_GRAINED_TOOL_STREAMING = 'fine-grained-tool-streaming-2025-05-14';

describe('addAzureClaudeParamsIfNeeded', () => {
  it('should add anthropic_beta for azure-openai provider with gcp-claude4-sonnet model', () => {
    const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'azure-openai');
    expect(result).toEqual({
      anthropic_beta: [FINE_GRAINED_TOOL_STREAMING],
    });
  });

  it('should merge with existing params for azure-openai provider with gcp-claude4-sonnet model', () => {
    const existingParams = { customParam: 'value' };
    const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'azure-openai', existingParams);
    expect(result).toEqual({
      customParam: 'value',
      anthropic_beta: [FINE_GRAINED_TOOL_STREAMING],
    });
  });

  it('should not add params for other providers', () => {
    const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'openai');
    expect(result).toBeUndefined();
  });

  it('should not add params for other models on azure-openai', () => {
    const result = addAzureClaudeParamsIfNeeded('gpt-4', 'azure-openai');
    expect(result).toBeUndefined();
  });

  it('should return existing params unchanged for non-matching cases', () => {
    const existingParams = { customParam: 'value' };
    const result = addAzureClaudeParamsIfNeeded('gpt-4', 'openai', existingParams);
    expect(result).toEqual(existingParams);
  });

  describe('merging with a beta list the caller configured', () => {
    it('should keep a beta flag the caller requested', () => {
      const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'azure-openai', {
        anthropic_beta: ['context-management-2025-06-27'],
        output_config: { effort: 'high' },
      });
      expect(result).toEqual({
        output_config: { effort: 'high' },
        anthropic_beta: [FINE_GRAINED_TOOL_STREAMING, 'context-management-2025-06-27'],
      });
    });

    it('should not repeat the automatic flag the caller already listed', () => {
      const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'azure-openai', {
        anthropic_beta: [FINE_GRAINED_TOOL_STREAMING, 'context-management-2025-06-27'],
      });
      expect(result?.anthropic_beta).toEqual([
        FINE_GRAINED_TOOL_STREAMING,
        'context-management-2025-06-27',
      ]);
    });

    it('should read a comma-separated string as a list of flags', () => {
      const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'azure-openai', {
        anthropic_beta: 'context-management-2025-06-27,tool-search-tool-2025-10-19',
      });
      expect(result?.anthropic_beta).toEqual([
        FINE_GRAINED_TOOL_STREAMING,
        'context-management-2025-06-27',
        'tool-search-tool-2025-10-19',
      ]);
    });

    it('should trim padded flags and drop empty entries', () => {
      const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'azure-openai', {
        anthropic_beta: ' context-management-2025-06-27 ,  ,, tool-search-tool-2025-10-19 ',
      });
      expect(result?.anthropic_beta).toEqual([
        FINE_GRAINED_TOOL_STREAMING,
        'context-management-2025-06-27',
        'tool-search-tool-2025-10-19',
      ]);
    });

    it('should keep the automatic flag for a value that cannot hold a beta list', () => {
      const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'azure-openai', {
        anthropic_beta: null,
      });
      expect(result?.anthropic_beta).toEqual([FINE_GRAINED_TOOL_STREAMING]);
    });

    it('should not mutate the params object the caller passed in', () => {
      const existingParams = { anthropic_beta: ['context-management-2025-06-27'] };
      const result = addAzureClaudeParamsIfNeeded(
        'gcp-claude4-sonnet',
        'azure-openai',
        existingParams,
      );
      expect(existingParams).toEqual({ anthropic_beta: ['context-management-2025-06-27'] });
      expect(result).not.toBe(existingParams);
    });

    it('should leave a caller-configured beta list untouched for other models', () => {
      const existingParams = { anthropic_beta: ['context-management-2025-06-27'] };
      const result = addAzureClaudeParamsIfNeeded('gpt-4', 'azure-openai', existingParams);
      expect(result).toBe(existingParams);
      expect(result?.anthropic_beta).toEqual(['context-management-2025-06-27']);
    });
  });
});
