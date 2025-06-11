/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { checkAdbAvailability } from './adbCheck';

// 模拟依赖
vi.mock('@ui-tars/operator-adb', () => ({
  getAndroidDeviceId: vi.fn(),
}));

vi.mock('@main/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@main/store/create', () => ({
  store: {
    setState: vi.fn(),
  },
}));

describe('checkAdbAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when device ID is available', async () => {
    vi.mocked(
      require('@ui-tars/operator-adb').getAndroidDeviceId,
    ).mockResolvedValue('test-device-id');

    const result = await checkAdbAvailability();

    expect(result).toBe(true);
    expect(vi.mocked(require('@main/logger').logger.info)).toHaveBeenCalledWith(
      'Checking ADB availability...',
    );
    expect(vi.mocked(require('@main/logger').logger.info)).toHaveBeenCalledWith(
      'ADB availability: true',
    );
    expect(
      vi.mocked(require('@main/store/create').store.setState),
    ).toHaveBeenCalledWith({ adbAvailable: true });
  });

  it('should return false when device ID is null', async () => {
    vi.mocked(
      require('@ui-tars/operator-adb').getAndroidDeviceId,
    ).mockResolvedValue(null);

    const result = await checkAdbAvailability();

    expect(result).toBe(false);
    expect(vi.mocked(require('@main/logger').logger.info)).toHaveBeenCalledWith(
      'Checking ADB availability...',
    );
    expect(vi.mocked(require('@main/logger').logger.info)).toHaveBeenCalledWith(
      'ADB availability: false',
    );
    expect(
      vi.mocked(require('@main/store/create').store.setState),
    ).toHaveBeenCalledWith({ adbAvailable: false });
  });

  it('should handle errors and return false', async () => {
    vi.mocked(
      require('@ui-tars/operator-adb').getAndroidDeviceId,
    ).mockRejectedValue(new Error('ADB not found'));

    const result = await checkAdbAvailability();

    expect(result).toBe(false);
    expect(
      vi.mocked(require('@main/logger').logger.error),
    ).toHaveBeenCalledWith(
      'Error checking ADB availability:',
      expect.any(Error),
    );
    expect(
      vi.mocked(require('@main/store/create').store.setState),
    ).toHaveBeenCalledWith({ adbAvailable: false });
  });
});
