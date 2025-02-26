/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { permissionRoute } from './permission';
import { store } from '@main/store/create';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@main/env', () => ({
  isMacOS: true,
}));

vi.mock('@main/store/create', () => ({
  store: {
    setState: vi.fn(),
    getState: vi.fn(() => ({
      ensurePermissions: { screenCapture: true, accessibility: true },
    })),
  },
}));

vi.mock('@main/utils/systemPermissions', () => ({
  ensurePermissions: vi.fn(() => ({
    screenCapture: true,
    accessibility: true,
  })),
}));

describe('permissionRoute.getEnsurePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should handle MacOS permission check errors', async () => {
    const mockSystemPermissions = await import('@main/utils/systemPermissions');
    (mockSystemPermissions.ensurePermissions as any).mockImplementation(() => {
      throw new Error('Failed to check system permissions');
    });

    await expect(
      permissionRoute.getEnsurePermissions.handle({
        input: undefined,
        context: {} as any,
      }),
    ).rejects.toThrow('Failed to check system permissions');
  });

  it('should handle store state update errors', async () => {
    const mockSystemPermissions = await import('@main/utils/systemPermissions');
    (mockSystemPermissions.ensurePermissions as any).mockReturnValue({
      screenCapture: true,
      accessibility: true,
    });

    (store.setState as any).mockImplementationOnce(() => {
      throw new Error('Failed to update store state');
    });

    await expect(
      permissionRoute.getEnsurePermissions.handle({
        input: undefined,
        context: {} as any,
      }),
    ).rejects.toThrow('Failed to update store state');
  });

  it('should handle store getState errors', async () => {
    const mockSystemPermissions = await import('@main/utils/systemPermissions');
    (mockSystemPermissions.ensurePermissions as any).mockReturnValue({
      screenCapture: true,
      accessibility: true,
    });

    (store.getState as any).mockImplementationOnce(() => {
      throw new Error('Failed to get store state');
    });

    await expect(
      permissionRoute.getEnsurePermissions.handle({
        input: undefined,
        context: {} as any,
      }),
    ).rejects.toThrow('Failed to get store state');
  });

  it('should handle invalid permission response format', async () => {
    const mockSystemPermissions = await import('@main/utils/systemPermissions');
    (mockSystemPermissions.ensurePermissions as any).mockReturnValue({
      screenCapture: true,
      accessibility: true,
    });

    (store.getState as any).mockReturnValue({
      ensurePermissions: { screenCapture: true, accessibility: true },
    });

    const result = await permissionRoute.getEnsurePermissions.handle({
      input: undefined,
      context: {} as any,
    });

    expect(result).toEqual({
      screenCapture: true,
      accessibility: true,
    });
  });
});
