/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, afterEach } from 'vitest';
import { resolveValue } from '../src/utils/misc';

describe('resolveValue', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns undefined when no value is provided', () => {
    expect(resolveValue(undefined)).toBeUndefined();
    expect(resolveValue('', 'API key')).toBeUndefined();
  });

  it('keeps values that are not all-uppercase literals', () => {
    expect(resolveValue('sk-proj-AbC123', 'API key')).toBe('sk-proj-AbC123');
    expect(resolveValue('https://api.example.com/v1', 'base URL')).toBe(
      'https://api.example.com/v1',
    );
  });

  it('resolves an all-uppercase value from the matching environment variable', () => {
    process.env.MY_TEST_API_KEY = 'real-secret-value';

    expect(resolveValue('MY_TEST_API_KEY', 'API key')).toBe('real-secret-value');
  });

  it('never resolves to the variable name when the variable is set but empty', () => {
    process.env.MY_EMPTY_API_KEY = '';

    expect(resolveValue('MY_EMPTY_API_KEY', 'API key')).toBe('');
  });

  it('falls back to the literal when the variable is not defined at all', () => {
    delete process.env.MY_UNSET_API_KEY;

    expect(resolveValue('MY_UNSET_API_KEY', 'API key')).toBe('MY_UNSET_API_KEY');
  });
});
