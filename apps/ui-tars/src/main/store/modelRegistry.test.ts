/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import {
  CODEX_OPENAI_BETA,
  CODEX_ORIGINATOR,
  CODEX_OAUTH_SUPPORTED_MODELS,
  getCodexReasoningEffortByModel,
  getDefaultModelNameForProvider,
  getProviderModels,
  isKnownModelForProvider,
} from './modelRegistry';
import { Operator, VLMProviderV2 } from './types';
import { PresetSchema } from './validate';

describe('modelRegistry', () => {
  it('contains GPT-5.3 Codex variants for Codex OAuth provider', () => {
    expect(CODEX_OAUTH_SUPPORTED_MODELS).toContain('gpt-5.3-codex');
    expect(CODEX_OAUTH_SUPPORTED_MODELS).toContain('gpt-5.3');
  });

  it('returns provider model list from the registry', () => {
    const models = getProviderModels(VLMProviderV2.openai_codex_oauth);
    expect(models.length).toBeGreaterThan(0);
    expect(models).toContain('gpt-5.2-codex');
  });

  it('returns provider default model from the registry', () => {
    expect(
      getDefaultModelNameForProvider(VLMProviderV2.openai_codex_oauth),
    ).toBe('gpt-5.3-codex');
  });

  it('matches model against provider registry', () => {
    expect(
      isKnownModelForProvider(
        VLMProviderV2.openai_codex_oauth,
        'gpt-5.1-codex-mini',
      ),
    ).toBe(true);
    expect(
      isKnownModelForProvider(
        VLMProviderV2.openai_codex_oauth,
        'ui-tars-unknown',
      ),
    ).toBe(false);
  });

  it('provides Codex transport constants', () => {
    expect(CODEX_ORIGINATOR).toBe('codex_cli_rs');
    expect(CODEX_OPENAI_BETA).toBe('responses=experimental');
  });

  it('returns reasoning effort by Codex model family', () => {
    expect(getCodexReasoningEffortByModel('gpt-5.3-codex')).toBe('high');
    expect(getCodexReasoningEffortByModel('gpt-5.2')).toBe('high');
    expect(getCodexReasoningEffortByModel('gpt-5.1-codex-mini')).toBe('medium');
    expect(getCodexReasoningEffortByModel('gpt-5.1-codex')).toBe('medium');
  });
});

describe('PresetSchema with Codex OAuth provider', () => {
  it('allows empty api key for Codex OAuth provider', () => {
    const parsed = PresetSchema.parse({
      vlmProvider: VLMProviderV2.openai_codex_oauth,
      vlmBaseUrl: 'https://chatgpt.com/backend-api/codex',
      vlmApiKey: '',
      vlmModelName: 'gpt-5.3-codex',
      useResponsesApi: true,
      operator: Operator.LocalComputer,
    });

    expect(parsed.vlmApiKey).toBe('');
  });

  it('rejects unsupported Codex OAuth model names', () => {
    expect(() =>
      PresetSchema.parse({
        vlmProvider: VLMProviderV2.openai_codex_oauth,
        vlmBaseUrl: 'https://chatgpt.com/backend-api/codex',
        vlmApiKey: '',
        vlmModelName: 'gpt-4.1',
        useResponsesApi: true,
        operator: Operator.LocalComputer,
      }),
    ).toThrowError(/Model is not supported by Codex OAuth provider/);
  });
});
