/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';

import { runWithRetryBudget } from '../src/retryEngine';

describe('runWithRetryBudget', () => {
  it('retries within bounded budget and succeeds deterministically', async () => {
    const onRetry = vi.fn();
    let attempts = 0;

    const result = await runWithRetryBudget(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('temporary');
        }
        return 'ok';
      },
      {
        maxRetries: 2,
        minTimeoutMs: 0,
        onRetry,
      },
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls.map((call) => call[1])).toEqual([1, 2]);
  });

  it('stops at retry budget and rethrows last error', async () => {
    let attempts = 0;

    await expect(
      runWithRetryBudget(
        async () => {
          attempts += 1;
          throw new Error('fail-always');
        },
        {
          maxRetries: 1,
          minTimeoutMs: 0,
        },
      ),
    ).rejects.toThrow('fail-always');

    expect(attempts).toBe(2);
  });

  it('does not retry when retry predicate rejects the error', async () => {
    let attempts = 0;

    await expect(
      runWithRetryBudget(
        async () => {
          attempts += 1;
          throw new Error('abort');
        },
        {
          maxRetries: 5,
          minTimeoutMs: 0,
          isRetryable: () => false,
        },
      ),
    ).rejects.toThrow('abort');

    expect(attempts).toBe(1);
  });
});
