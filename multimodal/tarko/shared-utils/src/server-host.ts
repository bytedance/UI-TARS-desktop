/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Default network interface an Agent server binds to.
 *
 * Loopback by default: the server exposes session creation, workspace files and
 * agent execution without authentication, so it must not be reachable from the
 * network unless the operator asks for it via `server.host`.
 */
export const DEFAULT_SERVER_HOST = '127.0.0.1';

/** Hosts that bind every interface rather than a single address. */
const WILDCARD_HOSTS = new Set(['0.0.0.0', '::', '::0']);

export function resolveServerHost(host?: string): string {
  const trimmed = host?.trim();
  return trimmed ? trimmed : DEFAULT_SERVER_HOST;
}

/**
 * Whether a bind address makes the server reachable from outside the machine.
 */
export function isExternallyReachableHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (WILDCARD_HOSTS.has(normalized)) {
    return true;
  }
  return !(
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized === '[::1]' ||
    normalized.startsWith('127.')
  );
}

/**
 * Build a URL that a user can actually open for a given bind address.
 *
 * Wildcard binds have no meaningful URL, so they render as `localhost`; every
 * other address is shown as-is so the log reflects the real binding.
 */
export function formatServerUrl(host: string, port: number, protocol = 'http'): string {
  const normalized = host.trim();
  const hostname = WILDCARD_HOSTS.has(normalized.toLowerCase())
    ? 'localhost'
    : normalized.includes(':') && !normalized.startsWith('[')
      ? `[${normalized}]`
      : normalized;

  return `${protocol}://${hostname}:${port}`;
}
