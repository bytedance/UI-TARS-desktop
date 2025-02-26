/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { FACTORS } from '@ui-tars/sdk/constants';

import { parseBoxToScreenCoords } from './coords';
const [WIDTH_FACTOR, HEIGHT_FACTOR] = FACTORS;

describe('parseBoxToScreenCoords', () => {
  it('should correctly parse single point coordinates', () => {
    const result = parseBoxToScreenCoords('[0.5,0.5]', 1000, 800);
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * WIDTH_FACTOR) / WIDTH_FACTOR,
      y: Math.round(0.5 * 800 * HEIGHT_FACTOR) / HEIGHT_FACTOR,
    });
  });

  it('should correctly parse box coordinates', () => {
    const result = parseBoxToScreenCoords('[0.2,0.3,0.4,0.5]', 1000, 800);
    expect(result).toEqual({
      x: Math.round(0.3 * 1000 * WIDTH_FACTOR) / WIDTH_FACTOR, // (0.2 + 0.4) / 2 = 0.3
      y: Math.round(0.4 * 800 * HEIGHT_FACTOR) / HEIGHT_FACTOR, // (0.3 + 0.5) / 2 = 0.4
    });
  });

  it('should handle whitespace in input string', () => {
    const result = parseBoxToScreenCoords('[ 0.5 , 0.5 ]', 1000, 800);
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * WIDTH_FACTOR) / WIDTH_FACTOR,
      y: Math.round(0.5 * 800 * HEIGHT_FACTOR) / HEIGHT_FACTOR,
    });
  });

  it('should handle integer coordinates', () => {
    const result = parseBoxToScreenCoords('[1,1,2,2]', 1000, 800);
    expect(result).toEqual({
      x: Math.round(1.5 * 1000 * WIDTH_FACTOR) / WIDTH_FACTOR,
      y: Math.round(1.5 * 800 * HEIGHT_FACTOR) / HEIGHT_FACTOR,
    });
  });
});
