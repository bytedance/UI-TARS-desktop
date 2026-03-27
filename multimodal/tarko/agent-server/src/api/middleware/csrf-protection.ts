/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_TOKENS = 1000;

const tokenStore = new Map<string, number>();

function cleanExpiredTokens(): void {
  const now = Date.now();
  for (const [token, expiry] of tokenStore) {
    if (expiry <= now) {
      tokenStore.delete(token);
    }
  }
}

export function generateCsrfToken(): string {
  // Clean expired tokens periodically
  if (tokenStore.size > MAX_TOKENS) {
    cleanExpiredTokens();
  }

  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, Date.now() + TOKEN_EXPIRY_MS);
  return token;
}

function isValidToken(token: string): boolean {
  const expiry = tokenStore.get(token);
  if (!expiry) {
    return false;
  }
  if (Date.now() > expiry) {
    tokenStore.delete(token);
    return false;
  }
  return true;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection middleware for Express.
 * Validates X-CSRF-Token header on mutation requests (POST/PUT/DELETE).
 * Safe methods (GET/HEAD/OPTIONS) are allowed through.
 */
export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const token = req.headers['x-csrf-token'] as string | undefined;
  if (!token || !isValidToken(token)) {
    res.status(403).json({
      error: 'CSRF token missing or invalid',
      message: 'A valid CSRF token is required for mutation requests. Obtain one via GET /api/v1/csrf-token.',
    });
    return;
  }

  next();
}
