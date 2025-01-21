/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
