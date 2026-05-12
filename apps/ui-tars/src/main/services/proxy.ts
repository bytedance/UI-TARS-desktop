/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { session } from 'electron';

import { logger } from '@main/logger';
import { SettingStore } from '@main/store/setting';
import { LocalStore } from '@main/store/validate';

/**
 * Apply proxy settings to Electron session and Node.js environment variables.
 */
export async function applyProxySettings(settings?: Partial<LocalStore>) {
  const store = settings ?? SettingStore.getStore();
  const { proxyEnabled, proxyMode, httpProxy, httpsProxy, noProxy } = store;

  if (!proxyEnabled) {
    // Clear proxy
    await session.defaultSession.setProxy({ mode: 'direct' });
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.no_proxy;
    logger.info('[Proxy] Proxy disabled, cleared all proxy settings');
    return;
  }

  if (proxyMode === 'system') {
    // Use system proxy - Electron will read from OS settings
    await session.defaultSession.setProxy({ mode: 'system' });
    // Clear env vars so Node.js also uses system proxy behavior
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.no_proxy;
    logger.info('[Proxy] Using system proxy settings');
    return;
  }

  // Custom proxy mode
  const proxyUrl = httpProxy?.trim();
  if (!proxyUrl) {
    logger.warn('[Proxy] Custom proxy enabled but no proxy URL configured');
    await session.defaultSession.setProxy({ mode: 'direct' });
    return;
  }

  // Validate and normalize proxy URL
  const normalizedProxyUrl = normalizeProxyUrl(proxyUrl);
  const normalizedHttpsProxyUrl = httpsProxy?.trim()
    ? normalizeProxyUrl(httpsProxy.trim())
    : undefined;

  // Build proxy rules for Electron session
  const proxyRules = buildProxyRules(
    normalizedProxyUrl,
    normalizedHttpsProxyUrl,
    noProxy?.trim(),
  );

  await session.defaultSession.setProxy({
    mode: 'fixed_servers',
    proxyRules,
  });

  // Set Node.js environment variables for HTTP clients (e.g. OpenAI SDK, fetch)
  process.env.HTTP_PROXY = normalizedProxyUrl;
  process.env.http_proxy = normalizedProxyUrl;

  if (normalizedHttpsProxyUrl) {
    process.env.HTTPS_PROXY = normalizedHttpsProxyUrl;
    process.env.https_proxy = normalizedHttpsProxyUrl;
  } else {
    process.env.HTTPS_PROXY = normalizedProxyUrl;
    process.env.https_proxy = normalizedProxyUrl;
  }

  if (noProxy?.trim()) {
    process.env.NO_PROXY = noProxy.trim();
    process.env.no_proxy = noProxy.trim();
  } else {
    delete process.env.NO_PROXY;
    delete process.env.no_proxy;
  }

  logger.info('[Proxy] Applied custom proxy:', proxyRules);
}

/**
 * Normalize proxy URL to include protocol if missing.
 */
function normalizeProxyUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('socks5://') || url.startsWith('socks4://')) {
    return url;
  }
  // Default to http:// if no protocol specified
  return `http://${url}`;
}

/**
 * Build Electron proxy rules string.
 * Format: "http=proxy:port;https=proxy:port" or "proxy:port"
 * @see https://www.electronjs.org/docs/latest/api/session#sessetproxyconfig
 */
function buildProxyRules(
  httpProxy: string,
  httpsProxy?: string,
  noProxy?: string,
): string {
  let rules = `http=${httpProxy}`;

  if (httpsProxy) {
    rules += `;https=${httpsProxy}`;
  } else {
    rules += `;https=${httpProxy}`;
  }

  if (noProxy) {
    rules += `;bypass-list=${noProxy}`;
  }

  return rules;
}

/**
 * Register a listener to apply proxy settings whenever they change.
 */
export function registerProxySettingsWatcher() {
  SettingStore.getInstance().onDidChange('proxyEnabled', () => {
    applyProxySettings();
  });
  SettingStore.getInstance().onDidChange('proxyMode', () => {
    applyProxySettings();
  });
  SettingStore.getInstance().onDidChange('httpProxy', () => {
    applyProxySettings();
  });
  SettingStore.getInstance().onDidChange('httpsProxy', () => {
    applyProxySettings();
  });
  SettingStore.getInstance().onDidChange('noProxy', () => {
    applyProxySettings();
  });
}
