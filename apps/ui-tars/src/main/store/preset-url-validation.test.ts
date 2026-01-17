/**
 * Target path: apps/ui-tars/src/main/store/preset-url-validation.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@main/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { SettingStore } from './setting';

const PUBLIC_IP = '93.184.216.34';

const buildRedirectResponse = (location: string): Response => {
  if (typeof Response !== 'undefined') {
    return new Response('', {
      status: 302,
      headers: { location },
    });
  }
  return {
    status: 302,
    ok: false,
    headers: { get: () => location },
    body: { cancel: () => {} },
  } as unknown as Response;
};

const buildOkResponse = (contentLength: number): Response => {
  if (typeof Response !== 'undefined') {
    return new Response('ok', {
      status: 200,
      headers: { 'content-length': String(contentLength) },
    });
  }
  return {
    status: 200,
    ok: true,
    headers: {
      get: (key: string) =>
        key.toLowerCase() === 'content-length' ? String(contentLength) : null,
    },
    body: null,
    text: async () => 'ok',
  } as unknown as Response;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SettingStore.validatePresetUrl', () => {
  it('rejects non-https URLs', async () => {
    await expect(
      SettingStore.validatePresetUrl('http://example.com/preset.yaml'),
    ).rejects.toThrow('HTTPS');
  });

  it('rejects localhost and localhost.', async () => {
    await expect(
      SettingStore.validatePresetUrl('https://localhost/preset.yaml'),
    ).rejects.toThrow('not allowed');
    await expect(
      SettingStore.validatePresetUrl('https://localhost./preset.yaml'),
    ).rejects.toThrow('not allowed');
  });

  it('rejects private IPv4 and loopback', async () => {
    await expect(
      SettingStore.validatePresetUrl('https://127.0.0.1/preset.yaml'),
    ).rejects.toThrow('private or local');
    await expect(
      SettingStore.validatePresetUrl('https://192.168.0.1/preset.yaml'),
    ).rejects.toThrow('private or local');
  });

  it('rejects IPv6 link-local addresses', async () => {
    await expect(
      SettingStore.validatePresetUrl('https://[fe80::1]/preset.yaml'),
    ).rejects.toThrow('private or local');
  });

  it('accepts public IPv4 host', async () => {
    const url = await SettingStore.validatePresetUrl(
      `https://${PUBLIC_IP}/preset.yaml`,
    );
    expect(url.hostname).toBe(PUBLIC_IP);
  });
});

describe('SettingStore.fetchPresetFromUrl', () => {
  it('rejects redirects to private hosts', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          buildRedirectResponse('https://127.0.0.1/preset.yaml'),
        ),
    );

    await expect(
      SettingStore.fetchPresetFromUrl(`https://${PUBLIC_IP}/preset.yaml`),
    ).rejects.toThrow('private or local');
  });

  it('rejects responses exceeding size limits', async () => {
    const limit =
      (SettingStore as unknown as { PRESET_MAX_BYTES?: number })
        .PRESET_MAX_BYTES ?? 1024 * 1024;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(buildOkResponse(limit + 1)),
    );

    await expect(
      SettingStore.fetchPresetFromUrl(`https://${PUBLIC_IP}/preset.yaml`),
    ).rejects.toThrow('too large');
  });
});
