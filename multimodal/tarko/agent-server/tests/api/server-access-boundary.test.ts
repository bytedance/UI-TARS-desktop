/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

import {
  createHostValidationMiddleware,
  isAllowedHostHeader,
} from '../../src/api/middleware/host-validation';
import {
  createNetworkAuthMiddleware,
  resolveServerAuth,
} from '../../src/api/middleware/network-auth';
import { isWorkspaceFileRequest } from '../../src/utils/workspace-static-server';

const PORT = 8888;

const createResponse = () => {
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as any,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload: any) => {
      res.body = payload;
      return res;
    }),
  };
  return res as unknown as Response & { statusCode?: number; body?: any };
};

describe('isAllowedHostHeader', () => {
  const options = { port: PORT, host: '127.0.0.1', allowedHosts: undefined };

  it('accepts the loopback names the server is reached by', () => {
    for (const host of [
      `localhost:${PORT}`,
      `127.0.0.1:${PORT}`,
      `[::1]:${PORT}`,
      'localhost',
      'LOCALHOST:8888',
    ]) {
      expect(isAllowedHostHeader(host, options)).toBe(true);
    }
  });

  it('rejects a rebound hostname, which is the attack this guards', () => {
    for (const host of [
      `evil.example:${PORT}`,
      `localhost.evil.example:${PORT}`,
      `127.0.0.1.evil.example:${PORT}`,
      'evil.example',
    ]) {
      expect(isAllowedHostHeader(host, options)).toBe(false);
    }
  });

  it('rejects a mismatched port and a missing header', () => {
    expect(isAllowedHostHeader(`localhost:${PORT + 1}`, options)).toBe(false);
    expect(isAllowedHostHeader(undefined, options)).toBe(false);
    expect(isAllowedHostHeader('', options)).toBe(false);
  });

  it('accepts IP literals, which DNS rebinding cannot produce', () => {
    const bound = { port: PORT, host: '0.0.0.0', allowedHosts: undefined };
    expect(isAllowedHostHeader(`192.168.1.5:${PORT}`, bound)).toBe(true);
    expect(isAllowedHostHeader(`[fe80::1]:${PORT}`, bound)).toBe(true);
    expect(isAllowedHostHeader(`lan.example:${PORT}`, bound)).toBe(false);
  });

  it('accepts the hostname the operator bound to', () => {
    const named = { port: PORT, host: 'agent.internal', allowedHosts: undefined };
    expect(isAllowedHostHeader(`agent.internal:${PORT}`, named)).toBe(true);
    expect(isAllowedHostHeader(`other.internal:${PORT}`, named)).toBe(false);
  });

  it('accepts explicitly allowed hosts, including on a proxy port', () => {
    const proxied = {
      port: PORT,
      host: '127.0.0.1',
      allowedHosts: 'agent.example:443, Proxy.example',
    };
    expect(isAllowedHostHeader('agent.example:443', proxied)).toBe(true);
    expect(isAllowedHostHeader('proxy.example', proxied)).toBe(true);
    expect(isAllowedHostHeader('unlisted.example', proxied)).toBe(false);
  });
});

describe('createHostValidationMiddleware', () => {
  const run = (host: string | undefined) => {
    const middleware = createHostValidationMiddleware({
      port: PORT,
      host: '127.0.0.1',
      allowedHosts: '',
    });
    const req = { headers: host === undefined ? {} : { host } } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();
    middleware(req, res, next);
    return { res, next };
  };

  it('passes a request the server actually answers on', () => {
    const { res, next } = run(`127.0.0.1:${PORT}`);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBeUndefined();
  });

  it('answers 403 to a rebound hostname without reaching the route', () => {
    const { res, next } = run(`evil.example:${PORT}`);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ error: 'Invalid Host header' });
  });
});

describe('resolveServerAuth', () => {
  const ORIGINAL_TOKEN = process.env.TARKO_AUTH_TOKEN;

  beforeEach(() => {
    delete process.env.TARKO_AUTH_TOKEN;
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env.TARKO_AUTH_TOKEN;
    } else {
      process.env.TARKO_AUTH_TOKEN = ORIGINAL_TOKEN;
    }
  });

  it('leaves a loopback server open', () => {
    for (const host of ['127.0.0.1', 'localhost', '::1']) {
      expect(resolveServerAuth({ host })).toEqual({ required: false });
    }
  });

  it('generates a token once the bind address is reachable elsewhere', () => {
    for (const host of ['0.0.0.0', '::', '192.168.1.5']) {
      const resolved = resolveServerAuth({ host });
      expect(resolved.required).toBe(true);
      expect(resolved.reason).toBe('externally-reachable');
      expect(resolved.token).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('uses a configured token, and requires it even on loopback', () => {
    const resolved = resolveServerAuth({ host: '127.0.0.1', token: 'configured-token' });
    expect(resolved).toEqual({
      required: true,
      token: 'configured-token',
      reason: 'configured',
    });
  });

  it('reads TARKO_AUTH_TOKEN when no token is configured', () => {
    process.env.TARKO_AUTH_TOKEN = 'from-env';
    expect(resolveServerAuth({ host: '0.0.0.0' }).token).toBe('from-env');
  });

  it('honours always and never regardless of the bind address', () => {
    expect(resolveServerAuth({ host: '127.0.0.1', mode: 'always' }).required).toBe(true);
    expect(resolveServerAuth({ host: '0.0.0.0', mode: 'never' })).toEqual({ required: false });
    expect(resolveServerAuth({ host: '0.0.0.0', mode: 'never', token: 'ignored' })).toEqual({
      required: false,
    });
  });
});

describe('createNetworkAuthMiddleware', () => {
  const TOKEN = 'a'.repeat(64);

  const run = (
    overrides: Partial<{
      method: string;
      originalUrl: string;
      headers: Record<string, string>;
      query: Record<string, unknown>;
    }> = {},
  ) => {
    const middleware = createNetworkAuthMiddleware(TOKEN);
    const req = {
      method: overrides.method ?? 'POST',
      originalUrl: overrides.originalUrl ?? '/api/v1/oneshot/query',
      headers: overrides.headers ?? {},
      query: overrides.query ?? {},
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();
    middleware(req, res, next);
    return { res, next };
  };

  it('rejects the unauthenticated oneshot call that made this exploitable', () => {
    const { res, next } = run();
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'Authentication required' });
  });

  it('rejects a wrong or truncated token', () => {
    expect(run({ headers: { authorization: `Bearer ${'b'.repeat(64)}` } }).res.statusCode).toBe(
      401,
    );
    expect(run({ headers: { authorization: `Bearer ${'a'.repeat(63)}` } }).res.statusCode).toBe(
      401,
    );
    expect(run({ headers: { authorization: TOKEN } }).res.statusCode).toBe(401);
  });

  it('accepts a bearer token', () => {
    const { res, next } = run({ headers: { authorization: `Bearer ${TOKEN}` } });
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBeUndefined();
  });

  it('accepts a query token, for requests a browser issues without headers', () => {
    const { next } = run({ method: 'GET', query: { token: TOKEN } });
    expect(next).toHaveBeenCalledOnce();
  });

  it('still guards the CSRF token endpoint, which hands out no identity', () => {
    const { res } = run({ method: 'GET', originalUrl: '/api/v1/csrf-token' });
    expect(res.statusCode).toBe(401);
  });

  it('leaves health and preflight reachable', () => {
    expect(run({ method: 'GET', originalUrl: '/api/v1/health' }).next).toHaveBeenCalledOnce();
    expect(run({ method: 'GET', originalUrl: '/api/v1/health?x=1' }).next).toHaveBeenCalledOnce();
    expect(run({ method: 'OPTIONS' }).next).toHaveBeenCalledOnce();
  });
});

describe('isWorkspaceFileRequest', () => {
  it('claims the workspace files that authentication has to cover', () => {
    for (const path of ['/notes.md', '/nested/report.pdf', '/static/app.js', '/assets/logo.svg']) {
      expect(isWorkspaceFileRequest(path)).toBe(true);
    }
  });

  it('leaves API calls and web UI routes to their own handlers', () => {
    for (const path of ['/api/v1/sessions', '/', '/settings', '/session/abc123']) {
      expect(isWorkspaceFileRequest(path)).toBe(false);
    }
  });
});
