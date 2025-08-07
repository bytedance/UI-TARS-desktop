/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tool } from '@tarko/agent-interface';
import { filterTools } from '../../src/utils/tool-filter';

vi.mock('@tarko/shared-utils', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
  })),
}));

describe('Tool Filter', () => {
  const mockTools: Tool[] = [
    // @ts-expect-error
    {
      name: 'browser-navigate',
      description: 'Navigate to a URL in browser',
    },
    // @ts-expect-error
    {
      name: 'browser-get-markdown',
      description: 'Get page content as markdown',
    },
    // @ts-expect-error
    {
      name: 'file-read',
      description: 'Read file contents',
    },
    // @ts-expect-error
    {
      name: 'file-write',
      description: 'Write content to file',
    },
    // @ts-expect-error
    {
      name: 'command-execute',
      description: 'Execute system command',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all tools when no filter options provided', () => {
    const result = filterTools(mockTools);
    expect(result).toEqual(mockTools);
    expect(result).toHaveLength(5);
  });

  it('should return all tools when empty filter options provided', () => {
    const result = filterTools(mockTools, {});
    expect(result).toEqual(mockTools);
  });

  it('should handle empty tools array', () => {
    const result = filterTools([], { include: ['browser'] });
    expect(result).toEqual([]);
  });

  it('should filter tools by include pattern', () => {
    const result = filterTools(mockTools, { include: ['browser'] });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.name)).toEqual(['browser-navigate', 'browser-get-markdown']);
  });

  it('should filter tools by multiple include patterns', () => {
    const result = filterTools(mockTools, { include: ['browser', 'file'] });
    expect(result).toHaveLength(4);
    expect(result.map((t) => t.name)).toEqual([
      'browser-navigate',
      'browser-get-markdown',
      'file-read',
      'file-write',
    ]);
  });

  it('should filter tools by exclude pattern', () => {
    const result = filterTools(mockTools, { exclude: ['browser'] });
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.name)).toEqual(['file-read', 'file-write', 'command-execute']);
  });

  it('should filter tools by multiple exclude patterns', () => {
    const result = filterTools(mockTools, { exclude: ['browser', 'command'] });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.name)).toEqual(['file-read', 'file-write']);
  });

  it('should apply include first, then exclude', () => {
    const result = filterTools(mockTools, {
      include: ['browser'],
      exclude: ['get'],
    });
    expect(result).toHaveLength(1);
    expect(result.map((t) => t.name)).toEqual(['browser-navigate']);
  });

  it('should return empty array when no tools match include pattern', () => {
    const result = filterTools(mockTools, { include: ['nonexistent'] });
    expect(result).toHaveLength(0);
  });

  it('should return all tools when no tools match exclude pattern', () => {
    const result = filterTools(mockTools, { exclude: ['nonexistent'] });
    expect(result).toEqual(mockTools);
  });

  it('should handle include and exclude resulting in empty array', () => {
    const result = filterTools(mockTools, {
      include: ['browser'],
      exclude: ['browser'],
    });
    expect(result).toHaveLength(0);
  });
});
