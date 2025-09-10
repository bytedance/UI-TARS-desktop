/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Next } from 'hono';
import { randomUUID } from 'crypto';
import type { HonoContext } from '../types';

/**
 * Request ID middleware for Hono
 * Generates or uses existing X-Request-ID header for request tracking
 */
export async function requestIdMiddleware(c: HonoContext, next: Next) {
  // Get request ID from header or generate a new one
  const requestId = c.req.header('x-request-id') || c.req.header('X-Request-ID') || randomUUID();
  
  // Store in context for other middlewares and handlers
  c.set('requestId', requestId);
  
  // Add to response headers
  c.res.headers.set('X-Request-ID', requestId);
  
  await next();
}