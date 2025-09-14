/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';

function parseNumFromBoxString(oriBox: string) {
  const numbers = oriBox
    .replace(/[()[\]]/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  return numbers;
}

describe('xml parser', () => {
  it('(1.1)', () => {
    const input = `(1.1)`;
    const result = parseNumFromBoxString(input);
    expect(result).toEqual(['1.1']);
  });

  it('(1, 1)', () => {
    const input = `(1, 1)`;
    const result = parseNumFromBoxString(input);
    expect(result).toEqual(['1', '1']);
  });

  it('[1, 1]', () => {
    const input = `[1, 1]`;
    const result = parseNumFromBoxString(input);
    expect(result).toEqual(['1', '1']);
  });

  it('[1,1]', () => {
    const input = `[1,1]`;
    const result = parseNumFromBoxString(input);
    expect(result).toEqual(['1', '1']);
  });

  it('[1 1]', () => {
    const input = `[1 1]`;
    const result = parseNumFromBoxString(input);
    expect(result).toEqual(['1 1']);
  });

  it('(1 1)', () => {
    const input = `(1 1)`;
    const result = parseNumFromBoxString(input);
    expect(result).toEqual(['1 1']);
  });

  it('((1, 1))', () => {
    const input = `((1, 1))`;
    const result = parseNumFromBoxString(input);
    expect(result).toEqual(['1', '1']);
  });

  it('1, 1', () => {
    const input = `1, 1`;
    const result = parseNumFromBoxString(input);
    expect(result).toEqual(['1', '1']);
  });

  it('1 1', () => {
    const input = `1 1`;
    const result = parseNumFromBoxString(input);
    expect(result).toEqual(['1 1']);
  });
});
