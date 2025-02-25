import { permissionRoute } from './permission';
import { store } from '@main/store/create';
import * as env from '@main/env';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@main/env', () => ({
  isMacOS: true,
}));

vi.mock('@main/store/create', () => ({
  store: {
    setState: vi.fn(),
    getState: vi.fn(),
  },
}));

vi.mock('@main/utils/systemPermissions', () => ({
  ensurePermissions: vi.fn(),
}));

describe('permissionRoute.getEnsurePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (store.setState as any).mockClear();
    (store.getState as any).mockClear();
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
    (store.setState as any).mockImplementation(() => {
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
    (store.getState as any).mockImplementation(() => {
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
      invalidKey: true,
    });

    const result = await permissionRoute.getEnsurePermissions.handle({
      input: undefined,
      context: {} as any,
    });

    expect(result).not.toHaveProperty('invalidKey');
    expect(result).toHaveProperty('screenCapture');
    expect(result).toHaveProperty('accessibility');
  });

  it('should handle platform switch errors', async () => {
    vi.spyOn(env, 'isMacOS', 'get').mockImplementation(() => {
      throw new Error('Failed to determine platform');
    });

    await expect(
      permissionRoute.getEnsurePermissions.handle({
        input: undefined,
        context: {} as any,
      }),
    ).rejects.toThrow('Failed to determine platform');
  });
});
