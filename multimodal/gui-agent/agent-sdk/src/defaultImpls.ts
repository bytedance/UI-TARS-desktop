/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ImageDetailCalculator } from '@gui-agent/shared/types';

/**
 * Default implementation for detail calculation based on pixel count
 * detail:low mode: 1,048,576 px (1024×1024)
 * detail:high mode: 4,014,080 px (2048×1960)
 */
export const defaultDetailCalculator: ImageDetailCalculator = (
  width: number,
  height: number,
): 'low' | 'high' | 'auto' => {
  const LOW_DETAIL_THRESHOLD = 1024 * 1024; // 1,048,576 px
  const HIGH_DETAIL_THRESHOLD = 2048 * 1960; // 4,014,080 px

  const pixelCount = width * height;
  if (pixelCount <= LOW_DETAIL_THRESHOLD) {
    return 'low';
  } else if (pixelCount <= HIGH_DETAIL_THRESHOLD) {
    return 'high';
  } else {
    // For images larger than high detail threshold, use high detail
    return 'auto';
  }
};
