/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextFunction, Request, Response } from 'express';

/**
 * Host header validation, a DNS rebinding defense.
 *
 * The Origin allowlist does not cover rebinding. Once an attacker re-resolves a
 * domain they control to the address this server listens on, requests issued by
 * their page are same-origin, and a same-origin GET carries no Origin header for
 * the allowlist to inspect. What still differs is the Host header: it holds the
 * name the browser was pointed at, `evil.example:8888` rather than
 * `localhost:8888`.
 *
 * Rebinding needs a DNS name, so a Host that is a literal IP address cannot come
 * out of it: a page reaching us at `http://192.168.1.5:8888` was served from that
 * address to begin with. Names have to be ones we already expect, which means
 * loopback, whatever the operator chose to bind, or an explicit
 * `TARKO_ALLOWED_HOSTS` entry.
 *
 * This constrains browsers only. Every other client writes its own Host header,
 * so it stops rebinding rather than network access; `network-auth.ts` is what
 * keeps unauthenticated callers out.
 */

const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1'];

const WILDCARD_HOSTS = new Set(['0.0.0.0', '::', '::0']);

const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

export interface HostValidationOptions {
  /** Port the server listens on. */
  port: number;
  /** Address the server bound to, already resolved by `resolveServerHost`. */
  host: string;
  /**
   * Additional hostnames to accept, comma separated, each optionally carrying a
   * port. Defaults to `TARKO_ALLOWED_HOSTS`, for reverse proxies and custom
   * names that this server cannot infer on its own.
   */
  allowedHosts?: string;
}

interface ParsedHost {
  hostname: string;
  port?: string;
}

function parseHostHeader(rawValue: string): ParsedHost | null {
  const value = rawValue.trim().toLowerCase();
  if (!value) {
    return null;
  }

  if (value.startsWith('[')) {
    const closing = value.indexOf(']');
    if (closing === -1) {
      return null;
    }
    const hostname = value.slice(1, closing);
    const remainder = value.slice(closing + 1);
    if (!remainder) {
      return { hostname };
    }
    return remainder.startsWith(':') ? { hostname, port: remainder.slice(1) } : null;
  }

  const separator = value.indexOf(':');
  if (separator === -1) {
    return { hostname: value };
  }

  // More than one colon can only be an unbracketed IPv6 address. That is not
  // valid in a Host header, but reading a port off it would be a guess.
  if (value.indexOf(':', separator + 1) !== -1) {
    return { hostname: value };
  }

  return { hostname: value.slice(0, separator), port: value.slice(separator + 1) };
}

/**
 * Whether a hostname is an IP address rather than a name. A DNS name is the one
 * thing rebinding can repoint, so literals are safe to accept.
 */
function isIpLiteral(hostname: string): boolean {
  if (IPV4_PATTERN.test(hostname)) {
    return hostname.split('.').every((octet) => Number(octet) <= 255);
  }

  // A colon cannot appear in a DNS name, so it marks an IPv6 literal.
  return hostname.includes(':');
}

function buildAllowedNames(options: HostValidationOptions): Set<string> {
  const names = new Set<string>(LOOPBACK_HOSTNAMES);

  // A wildcard bind names no single address, and a literal is covered by
  // `isIpLiteral`; only a hostname the operator picked needs recording here.
  const boundHost = options.host.trim().toLowerCase();
  if (boundHost && !WILDCARD_HOSTS.has(boundHost) && !isIpLiteral(boundHost)) {
    names.add(boundHost);
  }

  return names;
}

function buildExplicitEntries(allowedHosts?: string): Set<string> {
  const entries = new Set<string>();
  if (!allowedHosts) {
    return entries;
  }

  for (const entry of allowedHosts.split(',')) {
    const trimmed = entry.trim().toLowerCase();
    if (trimmed) {
      entries.add(trimmed);
    }
  }

  return entries;
}

export function isAllowedHostHeader(
  hostHeader: string | undefined,
  options: HostValidationOptions,
): boolean {
  if (!hostHeader) {
    return false;
  }

  const explicitEntries = buildExplicitEntries(
    options.allowedHosts ?? process.env.TARKO_ALLOWED_HOSTS,
  );

  // Matched before the port check so an operator can allow a proxy that
  // forwards from a different port.
  if (explicitEntries.has(hostHeader.trim().toLowerCase())) {
    return true;
  }

  const parsed = parseHostHeader(hostHeader);
  if (!parsed) {
    return false;
  }

  if (explicitEntries.has(parsed.hostname)) {
    return true;
  }

  if (parsed.port !== undefined && parsed.port !== String(options.port)) {
    return false;
  }

  if (isIpLiteral(parsed.hostname)) {
    return true;
  }

  return buildAllowedNames(options).has(parsed.hostname);
}

export function createHostValidationMiddleware(options: HostValidationOptions) {
  const resolved: HostValidationOptions = {
    ...options,
    allowedHosts: options.allowedHosts ?? process.env.TARKO_ALLOWED_HOSTS,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (isAllowedHostHeader(req.headers.host, resolved)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Invalid Host header',
      message:
        'The request Host header is not one this server answers on. Set TARKO_ALLOWED_HOSTS to allow additional hostnames.',
    });
  };
}
