/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ActionParserHelper } from '../src/ActionParserHelper';

const helper = new ActionParserHelper();

describe('parseCoordinates', () => {
  it('(1.1)', () => {
    const input = `(1.1)`;
    expect(() => helper.parseCoordinates(input)).toThrow(
      'Insufficient coordinate, at least 2 numbers required',
    );
  });

  it('(1, 1)', () => {
    const input = `(1, 1)`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('1 2 3 4', () => {
    const input = `1 2 3 4`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 2,
        y: 3,
      },
      referenceBox: {
        x1: 1,
        y1: 2,
        x2: 3,
        y2: 4,
      },
    });
  });

  it('[1, 1]', () => {
    const input = `[1, 1]`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('[1,1]', () => {
    const input = `[1,1]`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('[1 1]', () => {
    const input = `[1 1]`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('(1 1)', () => {
    const input = `(1 1)`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('((1, 1))', () => {
    const input = `((1, 1))`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('1, 1', () => {
    const input = `1, 1`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('1 1', () => {
    const input = `1 1`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('<point>1, 1<point>', () => {
    const input = `<point>1, 1<point>`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('<point>1 1<point>', () => {
    const input = `<point>1 1<point>`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('<point>1,1<point>', () => {
    const input = `<point>1,1<point>`;
    const result = helper.parseCoordinates(input);
    expect(result).toEqual({
      raw: {
        x: 1,
        y: 1,
      },
      referenceBox: {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1,
      },
    });
  });

  it('a, b', () => {
    const input = `a, b`;
    expect(() => helper.parseCoordinates(input)).toThrow('Invalid number at position 0: a');
  });
});
