/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { isExternallyReachableHost } from '@tarko/shared-utils';

/**
 * Shared-secret authentication for the Agent API.
 *
 * Everything under `/api/v1` can create sessions, read stored conversations and
 * run agent queries, and the agent ships with an unrestricted shell tool. A
 * loopback bind keeps that off the network but is not a credential, and neither
 * is the Host header, which any non-browser client writes for itself. So once
 * the operator binds an address other machines can reach, whoever can open a
 * socket is effectively a user.
 *
 * The default mode is `auto`: a token is required exactly when the bind address
 * is reachable from another machine, or when the operator configured one.
 * Loopback-only servers stay open so local tooling keeps working untouched.
 */

export type AgentServerAuthMode = 'auto' | 'always' | 'never';

/**
 * Shortest token accepted from configuration.
 *
 * The token is the only thing between a reachable server and agent execution,
 * so a guessable one is worse than none: it reads as protection while offering
 * none. Rejecting it outright at startup is clearer than throttling guesses
 * later, and the generated default is far longer than this.
 */
const MIN_CONFIGURED_TOKEN_LENGTH = 16;

/** Liveness only, and carries no session data, so probes work before a token. */
const PUBLIC_PATHS = new Set(['/api/v1/health']);

export interface ResolveServerAuthOptions {
  /** Address the server bound to, already resolved by `resolveServerHost`. */
  host: string;
  mode?: AgentServerAuthMode;
  token?: string;
}

export interface ResolvedServerAuth {
  required: boolean;
  token?: string;
  /** Why a token is required, so the CLI can explain it at startup. */
  reason?: 'configured' | 'externally-reachable';
}

export function resolveServerAuth(options: ResolveServerAuthOptions): ResolvedServerAuth {
  const mode = options.mode ?? 'auto';
  if (mode === 'never') {
    return { required: false };
  }

  const configuredToken = (options.token ?? process.env.TARKO_AUTH_TOKEN)?.trim() || undefined;
  if (configuredToken !== undefined && configuredToken.length < MIN_CONFIGURED_TOKEN_LENGTH) {
    throw new Error(
      `Access token must be at least ${MIN_CONFIGURED_TOKEN_LENGTH} characters. Leave it unset to have one generated.`,
    );
  }

  // Configuring a token is itself a request for authentication, so honour it
  // even on a loopback bind.
  const requiredByConfig = mode === 'always' || configuredToken !== undefined;
  if (!requiredByConfig && !isExternallyReachableHost(options.host)) {
    return { required: false };
  }

  return {
    required: true,
    token: configuredToken ?? randomBytes(32).toString('hex'),
    reason: requiredByConfig ? 'configured' : 'externally-reachable',
  };
}

function readPresentedToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header) {
    const [scheme, ...rest] = header.trim().split(/\s+/);
    if (scheme.toLowerCase() === 'bearer' && rest.length > 0) {
      return rest.join(' ');
    }
  }

  // Needed for requests a browser issues without scripted headers, such as the
  // workspace files an `<img>` tag pulls in.
  const queryToken = req.query?.token;
  if (typeof queryToken === 'string') {
    return queryToken;
  }

  return undefined;
}

function matchesToken(expected: Buffer, presented: string): boolean {
  const presentedBuffer = Buffer.from(presented);
  if (presentedBuffer.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(presentedBuffer, expected);
}

function createRequestAuthorizer(token: string) {
  const expected = Buffer.from(token);

  return (req: Request): boolean => {
    const presented = readPresentedToken(req);
    return presented !== undefined && matchesToken(expected, presented);
  };
}

export function createNetworkAuthMiddleware(token: string) {
  const isAuthorized = createRequestAuthorizer(token);

  return (req: Request, res: Response, next: NextFunction): void => {
    // `originalUrl` because this runs mounted on /api, which strips req.path.
    const path = req.originalUrl.split('?')[0];

    // A CORS preflight carries no credentials by definition.
    if (req.method === 'OPTIONS' || PUBLIC_PATHS.has(path)) {
      next();
      return;
    }

    if (isAuthorized(req)) {
      next();
      return;
    }

    res.status(401).json({
      error: 'Authentication required',
      message:
        'This server requires an access token because it is reachable beyond this machine. Send it as `Authorization: Bearer <token>` or a `token` query parameter.',
    });
  };
}

/**
 * Throttles repeated credential failures.
 *
 * Bounds how fast a caller can work through guesses; paired with the minimum
 * length above, an attacker gets neither a short secret nor a fast way to
 * search for it.
 *
 * A request carrying the right token is skipped outright, so a caller who
 * exhausts the limit locks out nobody but themselves. Without that, anyone able
 * to reach the port could keep the operator out by failing on purpose,
 * especially behind a proxy where everyone shares one address.
 */
export function createAuthRateLimiter(token: string, isCounted?: (requestPath: string) => boolean) {
  const countsTowardsLimit = createFailedAttemptPredicate(token, isCounted);

  return rateLimit({
    windowMs: 60_000,
    limit: 30,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req: Request) => !countsTowardsLimit(req),
    message: {
      error: 'Too many failed authentication attempts',
      message: 'Wait a minute before trying again.',
    },
  });
}

/**
 * Which requests count towards the limit above: a guess at the token, on a path
 * that needs one.
 */
export function createFailedAttemptPredicate(
  token: string,
  isCounted?: (requestPath: string) => boolean,
) {
  const isAuthorized = createRequestAuthorizer(token);

  return (req: Request): boolean =>
    !isAuthorized(req) && (isCounted === undefined || isCounted(req.path));
}

/**
 * Narrows an auth middleware to the requests `isProtected` claims.
 *
 * A catch-all mount covers two different things: workspace files, which carry
 * session data and need the token, and everything falling through to the web UI
 * shell, which has to stay loadable so the page can present one.
 */
export function createScopedAuthMiddleware(
  authMiddleware: (req: Request, res: Response, next: NextFunction) => void,
  isProtected: (requestPath: string) => boolean,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isProtected(req.path)) {
      next();
      return;
    }

    authMiddleware(req, res, next);
  };
}
