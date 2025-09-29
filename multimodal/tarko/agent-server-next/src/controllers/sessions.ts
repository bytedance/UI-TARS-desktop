/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HonoContext } from '../types';
import { getCurrentUserId } from '../middlewares/auth';
import { SessionInfo } from '@tarko/interface';
import { ShareService } from '../services';
import { filterSessionModel } from '../utils';

/**
 * Get all sessions (with multi-tenant support)
 */
export async function getAllSessions(c: HonoContext) {
  try {
    const server = c.get('server');

    let sessions: SessionInfo[];

    // In multi-tenant mode, only get user's sessions
    if (server.isMultiTenant()) {
      const userId = getCurrentUserId(c);
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
      }

      sessions = await server.daoFactory.getUserSessions(userId);
    } else {
      // Single tenant mode: get all sessions
      sessions = await server.daoFactory.getAllSessions();
    }

    filterSessionModel(sessions);

    return c.json({ sessions }, 200);
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return c.json({ error: 'Failed to get sessions' }, 500);
  }
}

/**
 * Create a new session (using SessionFactory)
 */
export async function createSession(c: HonoContext) {
  try {
    const server = c.get('server');
    const sessionFactory = server.getSessionFactory();
    const sessionPool = server.getSessionPool();

    const { session, events, sessionInfo, storageUnsubscribe } = await sessionFactory.createSession(c);

    sessionPool.set(session.id, session);

    // Save unsubscribe function for cleanup
    if (storageUnsubscribe) {
      server.storageUnsubscribes[session.id] = storageUnsubscribe;
    }

    return c.json(
      {
        sessionId: session.id,
        session: sessionInfo,
        events
      },
      201,
    );
  } catch (error) {
    console.error('Failed to create session:', error);
    return c.json({ error: 'Failed to create session' }, 500);
  }
}

/**
 * Get session details
 */
export async function getSessionDetails(c: HonoContext) {
  const server = c.get('server');
  const sessionId = c.req.query('sessionId');

  try {
    if (!sessionId) {
      return c.json({ error: 'SessionId not found' }, 404);
    }

    const sessionInfo = await server.daoFactory.getSessionInfo(sessionId);

    sessionInfo && filterSessionModel([sessionInfo]);

    if (sessionInfo) {
      return c.json(
        {
          session: sessionInfo,
        },
        200,
      );
    }

    return c.json({ error: 'Session not found' }, 404);
  } catch (error) {
    console.error(`Error getting session details for ${sessionId}:`, error);
    return c.json({ error: 'Failed to get session details' }, 500);
  }
}

/**
 * Get session events
 */
export async function getSessionEvents(c: HonoContext) {


  const server = c.get('server');
  const sessionId = c.req.query('sessionId');

  try {
    if (!sessionId) {
      return c.json({ error: 'Session ID is required' }, 400);
    }

    const events = await server.daoFactory.getSessionEvents(sessionId);

    return c.json({ events }, 200);
  } catch (error) {
    console.error(`Error getting events for session ${sessionId}:`, error);
    return c.json({ error: 'Failed to get session events' }, 500);
  }
}

/**
 * Get latest session events
 */
export async function getLatestSessionEvents(c: HonoContext) {
  try {
    const server = c.get('server');
    const sessionId = c.req.query('sessionId');

    if (!sessionId) {
      return c.json({ error: 'Session ID is required' }, 400);
    }

    const events = await server.daoFactory.getSessionEvents(sessionId);

    return c.json({ events }, 200);
  } catch (error) {
    console.error('Failed to get latest session events:', error);
    return c.json({ error: 'Failed to get latest session events' }, 500);
  }
}

/**
 * Get session status
 */
export async function getSessionStatus(c: HonoContext) {
  const session = c.get('session');

  try {

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const isProcessing = session.getProcessingStatus();

    return c.json(
      {
        sessionId: session.id,
        status: {
          isProcessing,
        state: session.agent.status(),
      },
      },
      200,
    );
  } catch (error) {
    console.error(`Error getting session status (${session?.id}):`, error);
    return c.json({ error: 'Failed to get session status' }, 500);
  }
}

/**
 * Update session metadata
 */
export async function updateSession(c: HonoContext) {
  const server = c.get('server');
  const body = await c.req.json();

  const { sessionId, metadata: metadataUpdates } = body as {
    sessionId: string;
    metadata: Partial<SessionInfo['metadata']>;
  };

  try {
    if (!sessionId) {
      return c.json({ error: 'SessionId not found' }, 404);
    }
    
    const sessionInfo = await server.daoFactory.getSessionInfo(sessionId);
    if (!sessionInfo) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const updatedMetadata = await server.daoFactory.updateSessionInfo(sessionId, {
      metadata: {
        ...sessionInfo.metadata,
        ...metadataUpdates,
      },
    });

    return c.json({ session: updatedMetadata }, 200);
  } catch (error) {
    console.error(`Error updating session ${sessionId}:`, error);
    return c.json({ error: 'Failed to update session' }, 500);
  }
}

/**
 * Delete a session
 */
export async function deleteSession(c: HonoContext) {
  const server = c.get('server');
  const sessionId = (await c.req.json())?.sessionId

  if (!sessionId) {
    return c.json({ error: 'sessionId not found' }, 404);
  }

  try {
    const sessionPool = server.getSessionPool();

    // Remove from session pool (handles cleanup)
    await sessionPool.delete(sessionId);

    // Clean up storage unsubscribe function
    if (server.storageUnsubscribes[sessionId]) {
      server.storageUnsubscribes[sessionId]();
      delete server.storageUnsubscribes[sessionId];
    }

    await server.daoFactory.deleteSession(sessionId);   

    return c.json({ success: true, message: 'Session deleted successfully' }, 200);
  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
    return c.json({ error: 'Failed to delete session' }, 500);
  }
}

/**
 * Generate summary for a session
 */
export async function generateSummary(c: HonoContext) {
  const body = await c.req.json();
  const { sessionId, messages, model, provider } = body;

  if (!sessionId) {
    return c.json({ error: 'Session ID is required' }, 400);
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: 'Messages are required' }, 400);
  }

  try {
    const server = c.get('server');
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // FIXME: Use smaller messages to generate summaries
    // Generate summary using the agent's method
    const summaryResponse = await session.agent.generateSummary({
      messages,
      model,
      provider,
    });

    // Return the summary
    c.json(summaryResponse, 200);
  } catch (error) {
    console.error(`Error generating summary for session ${sessionId}:`, error);
    c.json(
      {
        error: 'Failed to generate summary',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

/**
 * Share a session
 */
export async function shareSession(c: HonoContext) {
  const { sessionId, upload } = await c.req.json()

  if (!sessionId) {
    return c.json({ error: 'Session ID is required' }, 400);
  }

  try {
    const server = c.get('server');
    const shareService = new ShareService(server.appConfig, server.daoFactory, server);

    // Get agent instance if session is active (for slug generation)
    const agent = server.getSessionPool().get(sessionId)?.agent;
    const result = await shareService.shareSession(sessionId, upload, agent, server.versionInfo);
    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json({
        error: result.error || 'Failed to share session',
      }, 500);
    }
  } catch (error) {
    console.error(`Error sharing session ${sessionId}:`, error);
    return c.json({ error: 'Failed to share session' }, 500);
  }
}
