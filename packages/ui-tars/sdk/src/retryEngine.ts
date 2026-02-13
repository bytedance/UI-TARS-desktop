/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { sleep } from '@ui-tars/shared/utils';

import type { RetryConfig } from './types';

type RetryEngineConfig = RetryConfig & {
  minTimeoutMs: number;
  isRetryable?: (error: unknown) => boolean;
};

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};

export const runWithRetryBudget = async <T>(
  operation: () => Promise<T>,
  config: RetryEngineConfig,
): Promise<T> => {
  const maxRetries = Number.isFinite(config.maxRetries)
    ? Math.max(0, config.maxRetries)
    : 0;
  let retryAttempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error: unknown) {
      const retryable = config.isRetryable ? config.isRetryable(error) : true;
      if (!retryable || retryAttempt >= maxRetries) {
        throw error;
      }

      retryAttempt += 1;
      config.onRetry?.(toError(error), retryAttempt);

      if (config.minTimeoutMs > 0) {
        await sleep(config.minTimeoutMs);
      }
    }
  }
};
