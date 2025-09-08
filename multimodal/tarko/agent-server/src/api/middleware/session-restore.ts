/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { getLogger } from '@tarko/shared-utils';
import { AgentServer } from '../../server';
import { AgentSession } from '../../core';

const logger = getLogger('SessionRestoreMiddleware');
/**
 * Session recovery middleware
 * If the session is not in memory but the storage is available, try to restore the session from storage
 */
export async function sessionRestoreMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void | Response> {
  const server: AgentServer = req.app.locals.server;

  try {
    const sessionId = (req.query.sessionId as string) || (req.body.sessionId as string);

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    let session = server.sessions[sessionId];

    // If the session is not in memory but the storage is available, try to restore the session from storage
    if (!session && server.storageProvider) {
      const metadata = await server.storageProvider.getSessionInfo(sessionId);
      if (metadata) {
        try {
          // Recover sessions from storage using a custom AGIO provider
          session = new AgentSession(server, sessionId, server.getCustomAgioProvider());

          server.sessions[sessionId] = session;

          const { storageUnsubscribe } = await session.initialize();

          // Save unsubscribe function for cleaning
          if (storageUnsubscribe) {
            server.storageUnsubscribes[sessionId] = storageUnsubscribe;
          }

          logger.debug(`Session ${sessionId} restored from storage`);
        } catch (error) {
          logger.error(`Failed to restore session ${sessionId}:`, error);

          return res.status(200).json({
            sessionId,
            status: {
              isProcessing: false,
              state: 'stored', //Special state, indicating that the session exists in storage but is not activated
            },
          });
        }
      }
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Mounted on req for subsequent reading
    req.session = session;

    next();
  } catch (error) {
    logger.error(`Session restore middleware error: ${(error as Error).message}`);
    return res.status(500).json({ error: `Internal server error, ${(error as Error).message}` });
  }
}
