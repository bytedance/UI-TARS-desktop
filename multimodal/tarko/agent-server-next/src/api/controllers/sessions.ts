/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { nanoid } from 'nanoid';
import { SessionInfo } from '../../storage';
import { AgentSession } from '../../core';
import { createErrorResponse } from '../../utils/error-handler';
import type { HonoContext } from '../../types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get all sessions
 */
export async function getAllSessions(c: HonoContext) {
  try {
    const server = c.get('server');

    if (!server.storageProvider) {
      // If no storage, return only active sessions
      const activeSessions = Object.keys(server.sessions).map((id) => ({
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
      return c.json({ sessions: activeSessions }, 200);
    }

    // Get all sessions from storage
    const sessions = await server.storageProvider.getAllSessions();

    return c.json({ sessions }, 200);
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return c.json({ error: 'Failed to get sessions' }, 500);
  }
}

/**
 * Create a new session
 */
export async function createSession(c: HonoContext) {
  try {
    const server = c.get('server');
    const sessionId = nanoid();

    // Get session metadata if it exists (for restored sessions)
    let sessionInfo = null;
    if (server.storageProvider) {
      try {
        sessionInfo = (await server.storageProvider.getSessionInfo(sessionId)) || undefined;
      } catch (error) {
        // Session doesn't exist yet, will be created below
      }
    }

    // Pass custom AGIO provider and session metadata if available
    const session = new AgentSession(
      server,
      sessionId,
      server.getCustomAgioProvider(),
      sessionInfo || undefined,
    );

    //FIXME: All sessions are mounted globally, resulting in memory leaks
    server.sessions[sessionId] = session;

    const { storageUnsubscribe } = await session.initialize();

    // Save unsubscribe function for cleanup
    if (storageUnsubscribe) {
      server.storageUnsubscribes[sessionId] = storageUnsubscribe;
    }

    let savedSessionInfo: SessionInfo | undefined;
    // Store session metadata if we have storage
    if (server.storageProvider) {
      const now = Date.now();
      const sessionInfo: SessionInfo = {
        id: sessionId,
        createdAt: now,
        updatedAt: now,
        workspace: server.getCurrentWorkspace(),
        metadata: {
          agentInfo: {
            name: server.getCurrentAgentName()!,
            configuredAt: now,
          },
        },
      };

      try {
        savedSessionInfo = await server.storageProvider.createSession(sessionInfo);
      } catch (error) {
        console.warn(`Failed to save session info for ${sessionId}:`, error);
      }
    }

    return c.json(
      {
        sessionId,
        session: savedSessionInfo,
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
  const session = c.get('session');
  const sessionId = c.req.query('sessionId');

  try {
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (server.storageProvider && sessionId) {
      const sessionInfo = await server.storageProvider.getSessionInfo(sessionId);

      if (sessionInfo) {
        return c.json(
          {
            session: sessionInfo,
          },
          200,
        );
      }
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

    if (!server.storageProvider) {
      return c.json({ error: 'Storage not configured' }, 503);
    }

    const events = await server.storageProvider.getSessionEvents(sessionId);

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

    if (!server.storageProvider) {
      return c.json({ error: 'Storage not configured' }, 503);
    }

    const events = await server.storageProvider.getSessionEvents(sessionId);

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
  try {
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    return c.json(
      {
        sessionId: session.id,
        status: session.getStatus(),
      },
      200,
    );
  } catch (error) {
    console.error('Failed to get session status:', error);
    return c.json({ error: 'Failed to get session status' }, 500);
  }
}

/**
 * Update session metadata
 */
export async function updateSession(c: HonoContext) {
  const server = c.get('server');
  const session = c.get('session');
  const body = await c.req.json();

  const { sessionId, metadata: metadataUpdates } = body as {
    sessionId: string;
    metadata: Partial<SessionInfo['metadata']>;
  };

  try {
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (!server.storageProvider) {
      return c.json({ error: 'Storage not configured' }, 503);
    }

    const sessionInfo = await server.storageProvider.getSessionInfo(sessionId);
    if (!sessionInfo) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const updatedMetadata = await server.storageProvider.updateSessionInfo(sessionId, {
      metadata: {
        ...sessionInfo.metadata,
        ...metadataUpdates,
      },
    });

    c.json({ session: updatedMetadata }, 200);
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
  const session = c.get('session');

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const sessionId = session.id;

  try {
    // Clean up the session
    await session.cleanup();

    // Remove from server sessions
    delete server.sessions[sessionId];

    // Clean up storage unsubscribe function
    if (server.storageUnsubscribes[sessionId]) {
      server.storageUnsubscribes[sessionId]();
      delete server.storageUnsubscribes[sessionId];
    }

    // Delete from storage if available
    if (server.storageProvider) {
      try {
        await server.storageProvider.deleteSession(sessionId);
      } catch (error) {
        console.warn(`Failed to delete session ${sessionId} from storage:`, error);
      }
    }

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
