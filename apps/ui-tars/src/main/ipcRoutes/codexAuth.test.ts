/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { codexAuthRoute } from './codexAuth';
import { CodexAuthService } from '@main/services/codexAuth';

const serviceMocks = {
  login: vi.fn(),
  logout: vi.fn(),
  getStatus: vi.fn(),
};

vi.mock('@main/services/codexAuth', () => ({
  CodexAuthService: {
    getInstance: vi.fn(() => serviceMocks),
  },
}));

describe('codexAuthRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls login on CodexAuthService', async () => {
    serviceMocks.login.mockResolvedValue({ status: 'authenticated' });

    const result = await codexAuthRoute.codexAuthLogin.handle({
      input: undefined,
      context: {} as never,
    });

    expect(CodexAuthService.getInstance).toHaveBeenCalledTimes(1);
    expect(serviceMocks.login).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'authenticated' });
  });

  it('calls logout on CodexAuthService', async () => {
    serviceMocks.logout.mockResolvedValue({ status: 'unauthenticated' });

    const result = await codexAuthRoute.codexAuthLogout.handle({
      input: undefined,
      context: {} as never,
    });

    expect(CodexAuthService.getInstance).toHaveBeenCalledTimes(1);
    expect(serviceMocks.logout).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'unauthenticated' });
  });

  it('calls getStatus on CodexAuthService', async () => {
    serviceMocks.getStatus.mockResolvedValue({
      status: 'authenticated',
      accountId: 'acc-123',
      email: 'dev@example.com',
      expiresAt: Date.now() + 3600000,
    });

    const result = await codexAuthRoute.codexAuthStatus.handle({
      input: undefined,
      context: {} as never,
    });

    expect(CodexAuthService.getInstance).toHaveBeenCalledTimes(1);
    expect(serviceMocks.getStatus).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('authenticated');
  });
});
