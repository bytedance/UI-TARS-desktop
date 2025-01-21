/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { FACTOR } from '@main/agent/constant';

import { parseBoxToScreenCoords } from './coords';

describe('parseBoxToScreenCoords', () => {
  it('should correctly parse single point coordinates', () => {
    const result = parseBoxToScreenCoords('[0.5,0.5]', 1000, 800);
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * FACTOR) / FACTOR,
      y: Math.round(0.5 * 800 * FACTOR) / FACTOR,
    });
  });

  it('should correctly parse box coordinates', () => {
    const result = parseBoxToScreenCoords('[0.2,0.3,0.4,0.5]', 1000, 800);
    expect(result).toEqual({
      x: Math.round(0.3 * 1000 * FACTOR) / FACTOR, // (0.2 + 0.4) / 2 = 0.3
      y: Math.round(0.4 * 800 * FACTOR) / FACTOR, // (0.3 + 0.5) / 2 = 0.4
    });
  });

  it('should handle whitespace in input string', () => {
    const result = parseBoxToScreenCoords('[ 0.5 , 0.5 ]', 1000, 800);
    expect(result).toEqual({
      x: Math.round(0.5 * 1000 * FACTOR) / FACTOR,
      y: Math.round(0.5 * 800 * FACTOR) / FACTOR,
    });
  });

  it('should handle integer coordinates', () => {
    const result = parseBoxToScreenCoords('[1,1,2,2]', 1000, 800);
    expect(result).toEqual({
      x: Math.round(1.5 * 1000 * FACTOR) / FACTOR,
      y: Math.round(1.5 * 800 * FACTOR) / FACTOR,
    });
  });
});
