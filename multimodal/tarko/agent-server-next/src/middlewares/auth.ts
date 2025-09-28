/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { UserInfo, ContextVariables } from '../types';
import { getLogger } from '../utils/logger';

const logger = getLogger('AuthMiddleware');

/**
 * Decode user information from header
 */
function decodeUserInfo(encodedUser: string): UserInfo | null {
  try {
    return JSON.parse(decodeURIComponent(encodedUser));
  } catch {
    return null;
  }
}

/**
 * Authentication middleware for multi-tenant mode
 * Extracts user information from request headers and validates access
 */
export async function authMiddleware(c: Context<{ Variables: ContextVariables }>, next: Next) {
  const server = c.get('server');

  // Skip auth if not required
  if (!server.tenantConfig.auth) {
    await next();
    return;
  }

  let userInfo: UserInfo | null = null;

  // Try to get user info from X-User-Info header (for SSO integration)
  const userInfoHeader = c.req.header('X-User-Info');
  if (userInfoHeader) {
    userInfo = decodeUserInfo(userInfoHeader);
  }

  if (!userInfo) {
    throw new HTTPException(401, {
      message: 'Authentication required. Please provide valid credentials.',
    });
  }

  c.set('user', {
    ...userInfo,
    userId: userInfo.userId || userInfo.email,
  });

  if (server.isDebug) {
    logger.debug(`[Auth] User authenticated: ${userInfo.userId} (${userInfo.email})`);
  }

  await next();
}

/**
 * Get current user information from context
 */
export function getCurrentUser(c: Context<{ Variables: ContextVariables }>): UserInfo | null {
  return c.get('user') || null;
}

/**
 * Require authentication - throws error if user is not authenticated
 */
export function requireAuth(c: Context<{ Variables: ContextVariables }>): UserInfo {
  const user = getCurrentUser(c);
  if (!user) {
    throw new HTTPException(401, {
      message: 'Authentication required',
    });
  }
  return user;
}

/**
 * Get user ID from context (convenience function)
 */
export function getCurrentUserId(c: Context<{ Variables: ContextVariables }>): string | null {
  const user = getCurrentUser(c);
  return user?.userId || null;
}
