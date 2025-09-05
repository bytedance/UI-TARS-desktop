/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { parseBoxToScreenCoords } from '../src/utils';

describe('parseBoxToScreenCoords', () => {
  // it('should correctly parse box coordinates and calculate screen position', () => {
  //   // Test with 2 coordinates (x1, y1)
  //   const result1 = parseBoxToScreenCoords({
  //     boxStr: '[100, 200]',
  //     screenWidth: 1920,
  //     screenHeight: 1080,
  //     factors: [1000, 1000],
  //   });

  //   expect(result1).toEqual({
  //     x: 192, // (100 * 1920) / 1000
  //     y: 216, // (200 * 1080) / 1000
  //   });

  //   // Test with 4 coordinates (x1, y1, x2, y2)
  //   const result2 = parseBoxToScreenCoords({
  //     boxStr: '[100, 200, 300, 400]',
  //     screenWidth: 1920,
  //     screenHeight: 1080,
  //     factors: [1000, 1000],
  //   });

  //   expect(result2).toEqual({
  //     x: 384, // ((100 + 300) / 2 * 1920) / 1000
  //     y: 324, // ((200 + 400) / 2 * 1080) / 1000
  //   });
  // });

  // it('should handle empty box string', () => {
  //   const result = parseBoxToScreenCoords({
  //     boxStr: '',
  //     screenWidth: 1920,
  //     screenHeight: 1080,
  //   });

  //   expect(result).toEqual({
  //     x: null,
  //     y: null,
  //   });
  // });

  // it('should handle different screen dimensions', () => {
  //   const result = parseBoxToScreenCoords({
  //     boxStr: '[100, 200, 300, 400]',
  //     screenWidth: 3840, // 4K width
  //     screenHeight: 2160, // 4K height
  //     factors: [1000, 1000],
  //   });

  //   expect(result).toEqual({
  //     x: 768, // ((100 + 300) / 2 * 3840) / 1000
  //     y: 648, // ((200 + 400) / 2 * 2160) / 1000
  //   });
  // });

  // it('should handle different factor values', () => {
  //   const result = parseBoxToScreenCoords({
  //     boxStr: '[100, 200, 300, 400]',
  //     screenWidth: 1920,
  //     screenHeight: 1080,
  //     factors: [500, 500], // Different factors
  //   });

  //   expect(result).toEqual({
  //     x: 768, // ((100 + 300) / 2 * 1920) / 500
  //     y: 648, // ((200 + 400) / 2 * 1080) / 500
  //   });
  // });

  // it('should handle box string with spaces and brackets', () => {
  //   const result = parseBoxToScreenCoords({
  //     boxStr: '[ 100 , 200 , 300 , 400 ]', // With spaces
  //     screenWidth: 1920,
  //     screenHeight: 1080,
  //     factors: [1000, 1000],
  //   });

  //   expect(result).toEqual({
  //     x: 384, // ((100 + 300) / 2 * 1920) / 1000
  //     y: 324, // ((200 + 400) / 2 * 1080) / 1000
  //   });
  // });

  // it('should use default factors when not provided', () => {
  //   const result = parseBoxToScreenCoords({
  //     boxStr: '[100, 200, 300, 400]',
  //     screenWidth: 1920,
  //     screenHeight: 1080,
  //     // factors not provided, should use default [1000, 1000]
  //   });

  //   expect(result).toEqual({
  //     x: 384, // ((100 + 300) / 2 * 1920) / 1000
  //     y: 324, // ((200 + 400) / 2 * 1080) / 1000
  //   });
  // });

  it('return corret value using real data', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[0.593,0.017,0.593,0.017]',
      screenWidth: 1280,
      screenHeight: 1024,
    });

    expect(result).toEqual({
      x: 759.04,
      y: 17.408,
      percentX: 0.593,
      percentY: 0.017,
    });
  });

  it('return corret value using real data', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[0.536,0.075,0.536,0.075]',
      screenWidth: 1280,
      screenHeight: 1024,
    });

    expect(result).toEqual({
      x: 686.08,
      y: 76.8,
      percentX: 0.536,
      percentY: 0.075,
    });
  });
});
