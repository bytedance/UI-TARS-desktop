/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Next } from 'hono';
import { getLogger } from '@tarko/shared-utils';
import { AgentServer } from '../server';
import { AgentSession } from '../core';
import type { HonoContext } from '../types';

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

  try {
    // Get sessionId from query params or request body
    const sessionId = c.req.query('sessionId') || (await getSessionIdFromBody(c));

    if (!sessionId) {
      return c.json({ error: 'Session ID is required' }, 400);
    }

    let session = server.sessions[sessionId];

    // If the session is not in memory but the storage is available, try to restore the session from storage
    if (!session && server.storageProvider) {
      const metadata = await server.storageProvider.getSessionInfo(sessionId);
      if (metadata) {
        try {
          // Recover sessions from storage using a custom AGIO provider
          session = new AgentSession(server, sessionId, server.getCustomAgioProvider(), metadata);

          //FIXME: All sessions are mounted globally, resulting in memory leaks
          server.sessions[sessionId] = session;

          const { storageUnsubscribe } = await session.initialize();

          // Save unsubscribe function for cleaning
          if (storageUnsubscribe) {
            server.storageUnsubscribes[sessionId] = storageUnsubscribe;
          }

          logger.debug(`Session ${sessionId} restored from storage`);
        } catch (error) {
          logger.error(`Failed to restore session ${sessionId}:`, error);

          return c.json(
            {
              sessionId,
              status: {
                isProcessing: false,
                state: 'stored', // Special state, indicating that the session exists in storage but is not activated
              },
            },
            200,
          );
        }
      }
    }

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Store session in Hono context for subsequent reading
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
    // If parsing fails, return undefined
    return undefined;
  }
}
