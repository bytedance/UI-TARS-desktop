/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Next } from 'hono';
import type { HonoContext } from '../types';
import { getLogger } from '../utils/logger';

const logger = getLogger('SessionRestoreMiddleware');

/**
 * Session recovery middleware for Hono
 * If the session is not in memory but the storage is available, try to restore the session from storage
 */
export async function sessionRestoreMiddleware(
  c: HonoContext,
  next: Next,
): Promise<void | Response> {
  const server = c.get('server');
  const sessionPool = server.getSessionPool();

  try {
    const sessionId = c.req.query('sessionId') || (await getSessionIdFromBody(c));

    if (!sessionId) {
      return c.json({ error: 'Session ID is required' }, 400);
    }

    //Getting an AgentSession instance from memory
    let session = sessionPool.get(sessionId);

    // If not exist, restored the AgentSession instance based on the database data.
    if (!session) {
      logger.info('session instance not exist, prepare to restore');

      const start = Date.now();

      const restored = await server.getSessionFactory().restoreSession(sessionId);

      if (restored?.session) {
        logger.info(`Session ${sessionId} restored from storage, cost: `, Date.now() - start);

        session = restored?.session;
        sessionPool.set(sessionId, session);

        restored.storageUnsubscribe &&
          (server.storageUnsubscribes[sessionId] = restored.storageUnsubscribe);
      }
    } else {
      logger.info('get session from sessionPool, sessionId:', session.id);
    }

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // [Important] Store session in Hono context for subsequent reading
    c.set('session', session);

    await next();
  } catch (error) {
    logger.error(`Session restore middleware error: ${(error as Error).message}`);
    return c.json({ error: `Internal server error, ${(error as Error).message}` }, 500);
  }
}

/**
 * Helper function to extract sessionId from request body
 * Handles both JSON and form data
 */
async function getSessionIdFromBody(c: Context): Promise<string | undefined> {
  try {
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      return body?.sessionId;
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const body = await c.req.parseBody();
      return body?.sessionId as string;
    }

    return undefined;
  } catch {
    return undefined;
  }
}
