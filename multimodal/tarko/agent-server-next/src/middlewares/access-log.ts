/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Next } from 'hono';
import type { HonoContext } from '../types';
import { getLogger } from '../utils/logger';

const logger = getLogger('AccessLogMiddleware');

/**
 * Logging middleware for Hono
 * Logs HTTP requests with response status and timing
 */
export async function accessLogMiddleware(c: HonoContext, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  const requestId = c.get('requestId') || 'unknown';

  try {
    await next();
    const duration = Date.now() - start;
    const status = c.res.status;

    logger.info(`[${requestId}] ${method} ${url} - ${status} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`[${requestId}] ${method} ${url} - Error (${duration}ms):`, error);
    throw error;
  }
}