/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { UserInfo, ContextVariables } from '../types';

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
 * Extract user info from JWT token (simplified version)
 * In production, you should use a proper JWT library for validation
 */
function extractUserInfoFromJWT(token: string): UserInfo | null {
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, '');

    // In a real implementation, you would:
    // 1. Verify the JWT signature
    // 2. Check expiration
    // 3. Validate issuer
    // For now, we'll do a simple base64 decode of the payload
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));

    // Extract user information from JWT payload
    return {
      userId: payload.sub || payload.userId || payload.user_id,
      email: payload.email,
      name: payload.name,
      organization: payload.org || payload.organization,
      ...payload, // Include any additional claims
    };
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

  // If no user info from header, try JWT token
  if (!userInfo) {
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      userInfo = extractUserInfoFromJWT(authHeader);
    }
  }

  // If still no user info, check for API key or other auth methods
  if (!userInfo) {
    const apiKey = c.req.header('X-API-Key');
    if (apiKey) {
      // In a real implementation, you would validate the API key
      // and retrieve associated user information
      // For now, we'll create a basic user info
      userInfo = {
        userId: `api-key-${apiKey.substring(0, 8)}`,
        email: `api-user-${apiKey.substring(0, 8)}@api.local`,
        name: 'API User',
      };
    }
  }

  if (!userInfo || !userInfo.userId) {
    throw new HTTPException(401, {
      message: 'Authentication required. Please provide valid credentials.',
    });
  }

  // Validate required user information
  if (!userInfo.email) {
    throw new HTTPException(400, {
      message: 'Invalid user information: email is required',
    });
  }

  // Add user information to context
  c.set('user', userInfo);

  // Log successful authentication if in debug mode
  if (server.isDebug) {
    console.log(`[Auth] User authenticated: ${userInfo.userId} (${userInfo.email})`);
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
