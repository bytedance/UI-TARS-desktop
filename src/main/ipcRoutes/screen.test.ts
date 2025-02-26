/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { screenRoute } from './screen';
import { getScreenSize } from '@main/utils/screen';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock screen utils
vi.mock('@main/utils/screen', () => ({
  getScreenSize: vi.fn(),
}));

describe('screenRoute.getScreenSize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct screen dimensions and scale factor', async () => {
    const mockScreenData = {
      physicalSize: {
        width: 1920,
        height: 1080,
      },
      scaleFactor: 2,
    };

    (getScreenSize as any).mockReturnValue(mockScreenData);

    const result = await screenRoute.getScreenSize.handle({
      input: undefined,
      context: {} as any,
    });

    expect(result).toEqual({
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 2,
    });
    expect(getScreenSize).toHaveBeenCalledTimes(1);
  });

  it('should handle different screen resolutions', async () => {
    const mockScreenData = {
      physicalSize: {
        width: 2560,
        height: 1440,
      },
      scaleFactor: 1.5,
    };

    (getScreenSize as any).mockReturnValue(mockScreenData);

    const result = await screenRoute.getScreenSize.handle({
      input: undefined,
      context: {} as any,
    });

    expect(result).toEqual({
      screenWidth: 2560,
      screenHeight: 1440,
      scaleFactor: 1.5,
    });
  });

  it('should handle errors when screen info is not available', async () => {
    (getScreenSize as any).mockImplementation(() => {
      throw new Error('Failed to get screen information');
    });

    await expect(
      screenRoute.getScreenSize.handle({
        input: undefined,
        context: {} as any,
      }),
    ).rejects.toThrow('Failed to get screen information');
  });
});
