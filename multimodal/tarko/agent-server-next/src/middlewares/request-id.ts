/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Next } from 'hono';
import { randomUUID } from 'crypto';
import type { HonoContext } from '../types';

/**
 * Request ID middleware for Hono
 */
export async function requestIdMiddleware(c: HonoContext, next: Next) {
  const requestId = c.req.header('x-tt-logid') || c.req.header('X-TT-LOGID') || randomUUID();
  // save requestId to context
  c.set('requestId', requestId);
  
  c.res.headers.set('x-tt-logid', requestId);
  
  await next();
}