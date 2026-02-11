/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';

import { redactSensitiveData } from './redactSensitiveData';

describe('redactSensitiveData', () => {
  it('redacts sensitive object keys recursively', () => {
    const input = {
      vlmApiKey: 'sk-test-secret-value',
      nested: {
        access_token: 'access-token-value',
        refreshToken: 'refresh-token-value',
      },
      safeField: 'safe-value',
    };

    const result = redactSensitiveData(input);

    expect(result.vlmApiKey).toBe('[REDACTED]');
    expect(result.nested.access_token).toBe('[REDACTED]');
    expect(result.nested.refreshToken).toBe('[REDACTED]');
    expect(result.safeField).toBe('safe-value');
  });

  it('redacts bearer tokens and token-like string patterns', () => {
    const input = {
      message:
        'Authorization: Bearer abc.def.ghi and payload {"access_token":"token-123"}',
    };

    const result = redactSensitiveData(input);

    expect(result.message).toContain('Bearer [REDACTED]');
    expect(result.message).toContain('"access_token":"[REDACTED]');
  });

  it('handles arrays with mixed values', () => {
    const input = [
      { authorization: 'Bearer sample-token' },
      { text: 'plain text' },
      'sk-private-value-12345',
    ];

    const result = redactSensitiveData(input);

    expect((result[0] as { authorization: string }).authorization).toBe(
      '[REDACTED]',
    );
    expect((result[1] as { text: string }).text).toBe('plain text');
    expect(result[2]).toBe('[REDACTED]');
  });

  it('keeps Error diagnostics while redacting sensitive fields', () => {
    const error = new Error('Request failed with Bearer top-secret-token');
    (error as Error & { authToken?: string }).authToken = 'secret-token';

    const result = redactSensitiveData(error) as {
      name: string;
      message: string;
      stack?: string;
      authToken?: string;
    };

    expect(result.name).toBe('Error');
    expect(result.message).toContain('Bearer [REDACTED]');
    expect(result.authToken).toBe('[REDACTED]');
    expect(result.stack).toContain('Bearer [REDACTED]');
  });
});
