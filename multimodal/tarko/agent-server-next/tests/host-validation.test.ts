/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import {
  buildAllowedHosts,
  createHostValidationHook,
} from '../src/hooks/builtInHooks';

const PORT = 3000;

describe('buildAllowedHosts', () => {
  const ORIG_ALLOWED_HOSTS = process.env.TARKO_ALLOWED_HOSTS;
  afterEach(() => {
    if (ORIG_ALLOWED_HOSTS === undefined) delete process.env.TARKO_ALLOWED_HOSTS;
    else process.env.TARKO_ALLOWED_HOSTS = ORIG_ALLOWED_HOSTS;
  });

  it('includes the four default loopback host:port pairs', () => {
    delete process.env.TARKO_ALLOWED_HOSTS;
    const allowed = buildAllowedHosts(PORT);
    expect(allowed.has(`localhost:${PORT}`)).toBe(true);
    expect(allowed.has(`127.0.0.1:${PORT}`)).toBe(true);
    expect(allowed.has(`[::1]:${PORT}`)).toBe(true);
    expect(allowed.has(`[::ffff:127.0.0.1]:${PORT}`)).toBe(true);
  });

  it('rejects unrelated hostnames at the same port', () => {
    delete process.env.TARKO_ALLOWED_HOSTS;
    const allowed = buildAllowedHosts(PORT);
    expect(allowed.has(`evil.example:${PORT}`)).toBe(false);
    expect(allowed.has(`localhost.evil:${PORT}`)).toBe(false);
    expect(allowed.has(`127.0.0.1.evil:${PORT}`)).toBe(false);
  });

  it('rejects the same hostnames at a different port', () => {
    delete process.env.TARKO_ALLOWED_HOSTS;
    const allowed = buildAllowedHosts(PORT);
    expect(allowed.has(`localhost:${PORT + 1}`)).toBe(false);
    expect(allowed.has(`127.0.0.1:${PORT - 1}`)).toBe(false);
  });

  it('honors TARKO_ALLOWED_HOSTS (comma-separated, case-insensitive)', () => {
    process.env.TARKO_ALLOWED_HOSTS = 'agent.local:3000, AGENT-2.local:3000';
    const allowed = buildAllowedHosts(PORT);
    expect(allowed.has('agent.local:3000')).toBe(true);
    expect(allowed.has('agent-2.local:3000')).toBe(true);
  });
});

describe('createHostValidationHook', () => {
  let app: Hono;
  const ORIG_ALLOWED_HOSTS = process.env.TARKO_ALLOWED_HOSTS;

  beforeEach(() => {
    delete process.env.TARKO_ALLOWED_HOSTS;
    app = new Hono();
    app.use('*', createHostValidationHook(PORT).handler as any);
    app.get('/api/v1/sessions', (c) => c.json({ sessions: ['leak'] }, 200));
    app.post('/api/v1/sessions/delete', (c) => c.json({ ok: true }, 200));
  });

  afterEach(() => {
    if (ORIG_ALLOWED_HOSTS === undefined) delete process.env.TARKO_ALLOWED_HOSTS;
    else process.env.TARKO_ALLOWED_HOSTS = ORIG_ALLOWED_HOSTS;
  });

  async function fetchWith(host: string | undefined, method = 'GET', path = '/api/v1/sessions') {
    const headers: Record<string, string> = {};
    if (host !== undefined) headers.Host = host;
    return app.fetch(new Request(`http://example.test${path}`, { method, headers }));
  }

  it('allows GET with Host: localhost:<port>', async () => {
    const res = await fetchWith(`localhost:${PORT}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sessions: ['leak'] });
  });

  it('allows GET with Host: 127.0.0.1:<port>', async () => {
    const res = await fetchWith(`127.0.0.1:${PORT}`);
    expect(res.status).toBe(200);
  });

  it('rejects a DNS-rebinding GET (Host: evil.example:<port>) with 403', async () => {
    // This is the core DNS-rebinding scenario: same-origin GET from an
    // attacker-controlled domain that has been rebound to 127.0.0.1 carries
    // Host: evil.example:<port>, not localhost:<port>. Origin would be absent
    // (same-origin GET), so the CORS Origin check passes — Host validation is
    // the gate that catches it.
    const res = await fetchWith(`evil.example:${PORT}`);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('Invalid Host header');
  });

  it('rejects a DNS-rebinding POST with valid CSRF (Host: evil.example:<port>)', async () => {
    // Even if the attacker has captured a CSRF token via the same chain,
    // mutations from a rebound origin should be rejected at the Host layer.
    const res = await fetchWith(`evil.example:${PORT}`, 'POST', '/api/v1/sessions/delete');
    expect(res.status).toBe(403);
  });

  it('rejects requests with a missing Host header with 403', async () => {
    const res = await fetchWith(undefined);
    expect(res.status).toBe(403);
  });

  it('is case-insensitive in Host comparison', async () => {
    const res = await fetchWith(`LOCALHOST:${PORT}`);
    expect(res.status).toBe(200);
  });

  it('rejects hostnames that share a prefix with localhost (no implicit suffix match)', async () => {
    const res = await fetchWith(`localhost.evil:${PORT}`);
    expect(res.status).toBe(403);
  });

  it('rejects loopback Host with the wrong port', async () => {
    const res = await fetchWith(`localhost:${PORT + 1}`);
    expect(res.status).toBe(403);
  });

  it('allows hostnames added via TARKO_ALLOWED_HOSTS', async () => {
    process.env.TARKO_ALLOWED_HOSTS = `tarko.local:${PORT}`;
    const localApp = new Hono();
    localApp.use('*', createHostValidationHook(PORT).handler as any);
    localApp.get('/x', (c) => c.text('ok'));
    const res = await localApp.fetch(
      new Request('http://anything/x', { method: 'GET', headers: { Host: `tarko.local:${PORT}` } }),
    );
    expect(res.status).toBe(200);
  });
});
