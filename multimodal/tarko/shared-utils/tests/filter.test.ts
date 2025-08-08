/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterItems, FilterableItem, CommonFilterOptions } from '../src/filter';

vi.mock('./logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
  })),
}));

describe('Filter', () => {
  const mockItems: FilterableItem[] = [
    { name: 'browser-navigate' },
    { name: 'browser-get-markdown' },
    { name: 'file-read' },
    { name: 'file-write' },
    { name: 'command-execute' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all items when no filter options provided', () => {
    const result = filterItems(mockItems);
    expect(result).toEqual(mockItems);
    expect(result).toHaveLength(5);
  });

  it('should return all items when empty filter options provided', () => {
    const result = filterItems(mockItems, {});
    expect(result).toEqual(mockItems);
  });

  it('should handle empty items array', () => {
    const result = filterItems([], { include: ['browser'] });
    expect(result).toEqual([]);
  });

  it('should filter items by include pattern', () => {
    const result = filterItems(mockItems, { include: ['browser'] });
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.name)).toEqual(['browser-navigate', 'browser-get-markdown']);
  });

  it('should filter items by multiple include patterns', () => {
    const result = filterItems(mockItems, { include: ['browser', 'file'] });
    expect(result).toHaveLength(4);
    expect(result.map((item) => item.name)).toEqual([
      'browser-navigate',
      'browser-get-markdown',
      'file-read',
      'file-write',
    ]);
  });

  it('should filter items by exclude pattern', () => {
    const result = filterItems(mockItems, { exclude: ['browser'] });
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.name)).toEqual(['file-read', 'file-write', 'command-execute']);
  });

  it('should filter items by multiple exclude patterns', () => {
    const result = filterItems(mockItems, { exclude: ['browser', 'command'] });
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.name)).toEqual(['file-read', 'file-write']);
  });

  it('should apply include first, then exclude', () => {
    const result = filterItems(mockItems, {
      include: ['browser'],
      exclude: ['get'],
    });
    expect(result).toHaveLength(1);
    expect(result.map((item) => item.name)).toEqual(['browser-navigate']);
  });

  it('should return empty array when no items match include pattern', () => {
    const result = filterItems(mockItems, { include: ['nonexistent'] });
    expect(result).toHaveLength(0);
  });

  it('should return all items when no items match exclude pattern', () => {
    const result = filterItems(mockItems, { exclude: ['nonexistent'] });
    expect(result).toEqual(mockItems);
  });

  it('should handle include and exclude resulting in empty array', () => {
    const result = filterItems(mockItems, {
      include: ['browser'],
      exclude: ['browser'],
    });
    expect(result).toHaveLength(0);
  });

  it('should work with custom item type logging', () => {
    const result = filterItems(mockItems, { include: ['browser'] }, 'servers');
    expect(result).toHaveLength(2);
  });
});
