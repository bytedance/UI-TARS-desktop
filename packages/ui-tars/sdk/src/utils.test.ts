// /packages/sdk/src/utils.test.ts
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { parseBoxToScreenCoords } from './utils';
import { DEFAULT_FACTORS } from './constants';

describe('parseBoxToScreenCoords', () => {
  it('should correctly parse single point coordinates', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[0.5,0.5]',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0],
      y: Math.round(0.5 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1],
    });
  });

  it('should correctly parse single point coordinates by default factors', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[0.5,0.5]',
      screenWidth: 1000,
      screenHeight: 800,
    });
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0],
      y: Math.round(0.5 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1],
    });
  });

  it('should correctly parse box coordinates', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[0.2,0.3,0.4,0.5]',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: Math.round(0.3 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0], // (0.2 + 0.4) / 2 = 0.3
      y: Math.round(0.4 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1], // (0.3 + 0.5) / 2 = 0.4
    });
  });

  it('should handle whitespace in input string', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[ 0.5 , 0.5 ]',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0],
      y: Math.round(0.5 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1],
    });
  });

  it('should handle integer coordinates', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '[1,1,2,2]',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: Math.round(1.5 * 1000 * DEFAULT_FACTORS[0]) / DEFAULT_FACTORS[0],
      y: Math.round(1.5 * 800 * DEFAULT_FACTORS[1]) / DEFAULT_FACTORS[1],
    });
  });

  it('should handle empty box string', () => {
    const result = parseBoxToScreenCoords({
      boxStr: '',
      screenWidth: 1000,
      screenHeight: 800,
      factors: DEFAULT_FACTORS,
    });
    expect(result).toEqual({
      x: null,
      y: null,
    });
  });
});
