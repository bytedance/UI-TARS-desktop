/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {  Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { HonoContext } from '../types';
import { getLogger } from '../utils/logger';

const logger = getLogger('ErrorHandler');

/**
 * Global error handling middleware for Hono
 * Catches and formats all unhandled errors
 */
export async function errorHandlingMiddleware(c: HonoContext, next: Next) {
  try {
    await next();
  } catch (error) {
    const requestId = c.get('requestId') || 'unknown';

    // Handle HTTPException from Hono
    if (error instanceof HTTPException) {
      logger.warn(`[${requestId}] HTTP Exception: ${error.status} - ${error.message}`);
      return c.json(
        {
          error: error.message,
          requestId,
          status: error.status,
        },
        error.status,
      );
    }

    // Handle generic errors
    logger.error(`[${requestId}] Unhandled error:`, error);

    return c.json(
      {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        requestId,
        status: 500,
      },
      500,
    );
  }
}
