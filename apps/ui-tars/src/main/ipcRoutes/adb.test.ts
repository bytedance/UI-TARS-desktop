/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { adbRoute } from './adb';

// 模拟依赖
vi.mock('../services/adbCheck', () => ({
  checkAdbAvailability: vi.fn(),
}));

describe('adbRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call checkAdbAvailability and return the result', async () => {
    vi.mocked(
      require('../services/adbCheck').checkAdbAvailability,
    ).mockResolvedValue(true);

    const result = await adbRoute.checkAdbAvailability.handle({
      input: undefined,
      context: {} as any,
    });

    expect(result).toBe(true);
    expect(
      vi.mocked(require('../services/adbCheck').checkAdbAvailability),
    ).toHaveBeenCalled();
  });

  it('should handle errors from checkAdbAvailability', async () => {
    vi.mocked(
      require('../services/adbCheck').checkAdbAvailability,
    ).mockRejectedValue(new Error('Failed to check ADB availability'));

    await expect(
      adbRoute.checkAdbAvailability.handle({
        input: undefined,
        context: {} as any,
      }),
    ).rejects.toThrow('Failed to check ADB availability');
  });
});
