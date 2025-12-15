/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for tagPrefix-based tag filtering in changelog generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPreviousTag } from '../utils/github';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';

describe('getPreviousTag with tagPrefix filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should filter tags by tagPrefix correctly', async () => {
    // Mock git tag output
    const mockTags = [
      'pdk@0.0.6-beta.1',
      'pdk@0.0.5',
      '@agent-tars@0.3.0',
      'v0.3.0',
      'pdk@0.0.4',
    ].join('\n');

    vi.mocked(execa).mockResolvedValue({
      stdout: mockTags,
    } as any);

    const result = await getPreviousTag('pdk@0.0.6-beta.1', '/test/cwd', 'pdk@');

    expect(result).toBe('pdk@0.0.5');
    expect(execa).toHaveBeenCalledWith('git', ['tag', '--sort=-creatordate'], {
      cwd: '/test/cwd',
    });
  });

  it('should return null when no tags match tagPrefix', async () => {
    const mockTags = [
      '@agent-tars@0.3.0',
      'v0.3.0',
      'v0.2.0',
    ].join('\n');

    vi.mocked(execa).mockResolvedValue({
      stdout: mockTags,
    } as any);

    const result = await getPreviousTag('pdk@0.0.6-beta.1', '/test/cwd', 'pdk@');

    expect(result).toBeNull();
  });

  it('should handle mixed tag formats correctly', async () => {
    const mockTags = [
      'pdk@0.0.6-beta.1',
      '@agent-tars@0.3.0',
      'v0.3.0',
      'pdk@0.0.5',
      '@agent-tars@0.2.9',
      'v0.2.0',
      'pdk@0.0.4',
    ].join('\n');

    vi.mocked(execa).mockResolvedValue({
      stdout: mockTags,
    } as any);

    const result = await getPreviousTag('pdk@0.0.6-beta.1', '/test/cwd', 'pdk@');

    expect(result).toBe('pdk@0.0.5');
  });

  it('should filter out canary releases even with tagPrefix', async () => {
    const mockTags = [
      'pdk@0.0.6-beta.1',
      'pdk@0.0.5-canary-abc123',
      'pdk@0.0.5',
      'pdk@0.0.4-canary-def456',
      'pdk@0.0.4',
    ].join('\n');

    vi.mocked(execa).mockResolvedValue({
      stdout: mockTags,
    } as any);

    const result = await getPreviousTag('pdk@0.0.6-beta.1', '/test/cwd', 'pdk@');

    expect(result).toBe('pdk@0.0.5');
  });

  it('should return most recent tag when current tag not found', async () => {
    const mockTags = [
      'pdk@0.0.5',
      'pdk@0.0.4',
      'pdk@0.0.3',
    ].join('\n');

    vi.mocked(execa).mockResolvedValue({
      stdout: mockTags,
    } as any);

    const result = await getPreviousTag('pdk@0.0.6-beta.1', '/test/cwd', 'pdk@');

    expect(result).toBe('pdk@0.0.5');
  });

  it('should work without tagPrefix (backward compatibility)', async () => {
    const mockTags = [
      'v0.3.0',
      'v0.2.0',
      'v0.1.0',
    ].join('\n');

    vi.mocked(execa).mockResolvedValue({
      stdout: mockTags,
    } as any);

    const result = await getPreviousTag('v0.3.0', '/test/cwd');

    expect(result).toBe('v0.2.0');
  });

  it('should handle empty tag list', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
    } as any);

    const result = await getPreviousTag('pdk@0.0.6-beta.1', '/test/cwd', 'pdk@');

    expect(result).toBeNull();
  });

  it('should handle git command errors gracefully', async () => {
    vi.mocked(execa).mockRejectedValue(new Error('Git command failed'));

    const result = await getPreviousTag('pdk@0.0.6-beta.1', '/test/cwd', 'pdk@');

    expect(result).toBeNull();
  });

  it('should handle complex real-world scenario', async () => {
    // Simulate the real tag list from the repository
    const mockTags = [
      'pdk@0.0.6-beta.1',
      'pdk@0.0.5-canary-7d05b7ce-20251213170600',
      'pdk@0.0.4-canary-156ae14f-20251213163615-canary-156ae14f-20251213163717',
      'pdk@0.0.4-canary-598a6df1e-20251202172337',
      '@agent-tars@0.3.0-beta.1',
      '@agent-tars@0.3.0-beta.0',
      '@agent-tars@0.2.9',
      'v0.3.0',
      'v0.2.0',
      'pdk@0.0.5',
      'pdk@0.0.4',
      'v0.1.0',
    ].join('\n');

    vi.mocked(execa).mockResolvedValue({
      stdout: mockTags,
    } as any);

    // Test case 1: Current version is 0.0.5, releasing 0.0.6-beta.1
    const result1 = await getPreviousTag('pdk@0.0.6-beta.1', '/test/cwd', 'pdk@');
    expect(result1).toBe('pdk@0.0.5');

    // Test case 2: Current version is 0.0.6-beta.1, releasing 0.0.6-beta.2
    const result2 = await getPreviousTag('pdk@0.0.6-beta.2', '/test/cwd', 'pdk@');
    expect(result2).toBe('pdk@0.0.6-beta.1');
  });

  it('should handle @agent-tars@ tagPrefix correctly', async () => {
    const mockTags = [
      '@agent-tars@0.3.0-beta.1',
      '@agent-tars@0.3.0-beta.0',
      '@agent-tars@0.2.9',
      '@agent-tars@0.2.8',
      'pdk@0.0.6-beta.1',
      'v0.3.0',
    ].join('\n');

    vi.mocked(execa).mockResolvedValue({
      stdout: mockTags,
    } as any);

    const result = await getPreviousTag('@agent-tars@0.3.0-beta.1', '/test/cwd', '@agent-tars@');

    expect(result).toBe('@agent-tars@0.3.0-beta.0');
  });

  it('should handle v tagPrefix correctly', async () => {
    const mockTags = [
      'v0.3.0',
      'v0.2.0',
      'v0.1.0',
      '@agent-tars@0.3.0-beta.1',
      'pdk@0.0.6-beta.1',
    ].join('\n');

    vi.mocked(execa).mockResolvedValue({
      stdout: mockTags,
    } as any);

    const result = await getPreviousTag('v0.3.0', '/test/cwd', 'v');

    expect(result).toBe('v0.2.0');
  });
});