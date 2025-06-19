// /packages/sdk/src/utils.test.ts
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { parseBoxToScreenCoords, processVlmParams } from './utils';
import { DEFAULT_FACTORS } from './constants';
import { IMAGE_PLACEHOLDER, MAX_IMAGE_LENGTH } from '@ui-tars/shared/constants';

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

describe('processVlmParams', () => {
  it('should correctly process vlm params', () => {
    const result = processVlmParams(
      [
        {
          from: 'human',
          value: 'system prompt',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
      ],
      ['data:image/png;base64,image_1'],
      MAX_IMAGE_LENGTH,
    );
    expect(result).toEqual({
      conversations: [
        {
          from: 'human',
          value: 'system prompt',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
      ],
      images: ['data:image/png;base64,image_1'],
    });
  });

  it('should correctly process vlm params with max image length', () => {
    const result = processVlmParams(
      [
        {
          from: 'human',
          value: 'system prompt',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
        {
          from: 'gpt',
          value: 'assistant response',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
        {
          from: 'gpt',
          value: 'assistant response',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
      ],
      [
        'data:image/png;base64,image_1',
        'data:image/png;base64,image_2',
        'data:image/png;base64,image_3',
      ],
      2,
    );
    expect(result).toEqual({
      conversations: [
        {
          from: 'human',
          value: 'system prompt',
        },
        {
          from: 'gpt',
          value: 'assistant response',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
        {
          from: 'gpt',
          value: 'assistant response',
        },
        {
          from: 'human',
          value: IMAGE_PLACEHOLDER,
        },
      ],
      images: [
        'data:image/png;base64,image_2',
        'data:image/png;base64,image_3',
      ],
    });
  });
});
