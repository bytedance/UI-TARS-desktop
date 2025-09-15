/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { addAzureClaudeParamsIfNeeded } from '../src/azure-claude-params';

describe('addAzureClaudeParamsIfNeeded', () => {
  it('should add anthropic_beta for azure-openai provider with gcp-claude4-sonnet model', () => {
    const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'azure-openai');
    expect(result).toEqual({
      anthropic_beta: ['fine-grained-tool-streaming-2025-05-14'],
    });
  });

  it('should merge with existing params for azure-openai provider with gcp-claude4-sonnet model', () => {
    const existingParams = { customParam: 'value' };
    const result = addAzureClaudeParamsIfNeeded('gcp-claude4-sonnet', 'azure-openai', existingParams);
    expect(result).toEqual({
      customParam: 'value',
      anthropic_beta: ['fine-grained-tool-streaming-2025-05-14'],
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
});
