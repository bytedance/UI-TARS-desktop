/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { AgentTARSServer } from '../../server';
import { ensureWorkingDirectory } from '../../utils/workspace';
import { SessionMetadata } from '../../storage';
import { AgentSession } from '../../core';
import { ShareService } from '../../services';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get all sessions
 */
export async function getAllSessions(req: Request, res: Response) {
  try {
    const server = req.app.locals.server;

    if (!server.storageProvider) {
      // If no storage, return only active sessions
      const activeSessions = Object.keys(server.sessions).map((id) => ({
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
      return res.status(200).json({ sessions: activeSessions });
    }

    // Get all sessions from storage
    const sessions = await server.storageProvider.getAllSessions();

    res.status(200).json({ sessions });
  } catch (error) {
    console.error('Failed to get sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
}

/**
 * Create a new session
 */
export async function createSession(req: Request, res: Response) {
  try {
    const server = req.app.locals.server;

    const sessionId = nanoid();

    await cleanupBrowserPagesForExistingSessions(server);

    // Use config.workspace?.isolateSessions (defaulting to false) to determine directory isolation
    const isolateSessions = server.appConfig.workspace?.isolateSessions ?? false;
    const workingDirectory = ensureWorkingDirectory(
      sessionId,
      server.workspacePath,
      isolateSessions,
    );

    // Pass custom AGIO provider if available
    const session = new AgentSession(
      server,
      sessionId,
      server.getCustomAgioProvider(),
      workingDirectory,
    );

    server.sessions[sessionId] = session;

    const { storageUnsubscribe } = await session.initialize();

    // Save unsubscribe function for cleanup
    if (storageUnsubscribe) {
      server.storageUnsubscribes[sessionId] = storageUnsubscribe;
    }

    // Store session metadata if we have storage
    if (server.storageProvider) {
      const metadata: SessionMetadata = {
        id: sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workingDirectory,
      };

      await server.storageProvider.createSession(metadata);
    }

    res.status(201).json({ sessionId });
  } catch (error) {
    console.error('Failed to create session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

/**
 * Clean up browser pages for all existing sessions
 * Called when creating a new session to ensure that browser resources for the old session are properly released
 */
async function cleanupBrowserPagesForExistingSessions(server: AgentTARSServer): Promise<void> {
  try {
    // Get all active sessions
    const activeSessions = Object.values(server.sessions);

    // Call the method to clean up browser pages for each session
    for (const session of activeSessions) {
      if (session && session.agent) {
        const browserManager = session.agent.getBrowserManager?.();
        if (browserManager && browserManager.isLaunchingComplete()) {
          console.log(`Closing browser pages for session before creating new session`);
          await browserManager.closeAllPages();
        }
      }
    }
  } catch (error) {
    console.warn(
      `Failed to cleanup browser pages for existing sessions: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Don't throw an error, as this shouldn't prevent the creation of a new session
  }
}

/**
 * Get session details
 */
export async function getSessionDetails(req: Request, res: Response) {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const server = req.app.locals.server;

    // Check storage first
    if (server.storageProvider) {
      const metadata = await server.storageProvider.getSessionMetadata(sessionId);
      if (metadata) {
        return res.status(200).json({
          session: metadata,
        });
      }
    }

    return res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    console.error(`Error getting session details for ${sessionId}:`, error);
    res.status(500).json({ error: 'Failed to get session details' });
  }
}

/**
 * Get session events
 */
export async function getSessionEvents(req: Request, res: Response) {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const server = req.app.locals.server;

    if (!server.storageProvider) {
      return res.status(404).json({ error: 'Storage not configured, no events available' });
    }

    const events = await server.storageProvider.getSessionEvents(sessionId);
    res.status(200).json({ events });
  } catch (error) {
    console.error(`Error getting events for session ${sessionId}:`, error);
    res.status(500).json({ error: 'Failed to get session events' });
  }
}

/**
 * Get session status
 */
export async function getSessionStatus(req: Request, res: Response) {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const session = req.session as AgentSession;

    const isProcessing = session.getProcessingStatus();

    res.status(200).json({
      sessionId,
      status: {
        isProcessing,
        state: session.agent.status(),
      },
    });
  } catch (error) {
    console.error(`Error getting session status (${sessionId}):`, error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
}

/**
 * Update session metadata
 */
export async function updateSession(req: Request, res: Response) {
  const { sessionId, name, tags } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const server = req.app.locals.server;

    if (!server.storageProvider) {
      return res.status(404).json({ error: 'Storage not configured, cannot update session' });
    }

    const metadata = await server.storageProvider.getSessionMetadata(sessionId);
    if (!metadata) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updatedMetadata = await server.storageProvider.updateSessionMetadata(sessionId, {
      name,
      tags,
      updatedAt: Date.now(),
    });

    res.status(200).json({ session: updatedMetadata });
  } catch (error) {
    console.error(`Error updating session ${sessionId}:`, error);
    res.status(500).json({ error: 'Failed to update session' });
  }
}

/**
 * Delete a session
 */
export async function deleteSession(req: Request, res: Response) {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const server = req.app.locals.server;

    // Close active session if exists
    if (server.sessions[sessionId]) {
      // Before clearing the session, try clearing the browser page first
      try {
        const browserManager = server.sessions[sessionId].agent.getBrowserManager?.();
        if (browserManager && browserManager.isLaunchingComplete()) {
          console.log(`Closing browser pages for session ${sessionId} before deletion`);
          await browserManager.closeAllPages();
        }
      } catch (error) {
        console.warn(
          `Failed to cleanup browser pages for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue deleting sessions even if browser page cleanup fails
      }

      await server.sessions[sessionId].cleanup();
      delete server.sessions[sessionId];

      // Clean up storage unsubscribe
      if (server.storageUnsubscribes[sessionId]) {
        server.storageUnsubscribes[sessionId]();
        delete server.storageUnsubscribes[sessionId];
      }
    }

    // Delete from storage if configured
    if (server.storageProvider) {
      const deleted = await server.storageProvider.deleteSession(sessionId);
      if (!deleted) {
        return res.status(404).json({ error: 'Session not found in storage' });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
}

/**
 * Generate summary for a session
 */
export async function generateSummary(req: Request, res: Response) {
  const { sessionId, messages, model, provider } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  try {
    const server = req.app.locals.server;
    const session = server.sessions[sessionId];

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // FIXME: Use smaller messages to generate summaries
    // Generate summary using the agent's method
    const summaryResponse = await session.agent.generateSummary({
      messages,
      model,
      provider,
    });

    // Return the summary
    res.status(200).json(summaryResponse);
  } catch (error) {
    console.error(`Error generating summary for session ${sessionId}:`, error);
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Share a session
 */
export async function shareSession(req: Request, res: Response) {
  const { sessionId, upload } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const server = req.app.locals.server;
    const shareService = new ShareService(server.appConfig, server.storageProvider);

    // Get agent instance if session is active (for slug generation)
    const agent = server.sessions[sessionId]?.agent;
    const result = await shareService.shareSession(sessionId, upload, agent, server.extraOptions);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json({
        error: result.error || 'Failed to share session',
      });
    }
  } catch (error) {
    console.error(`Error sharing session ${sessionId}:`, error);
    return res.status(500).json({ error: 'Failed to share session' });
  }
}

/**
 * Get events from the latest updated session
 */
export async function getLatestSessionEvents(req: Request, res: Response) {
  try {
    const server = req.app.locals.server;

    if (!server.storageProvider) {
      return res
        .status(404)
        .json({ error: 'Storage not configured, cannot get latest session events' });
    }

    // Get all sessions
    const sessions = await server.storageProvider.getAllSessions();

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'No sessions found' });
    }

    // Find the session with the most recent updatedAt timestamp
    const latestSession = sessions.reduce((latest, current) => {
      return current.updatedAt > latest.updatedAt ? current : latest;
    });

    // Get events for the latest session
    const events = await server.storageProvider.getSessionEvents(latestSession.id);

    res.status(200).json({
      sessionId: latestSession.id,
      sessionMetadata: latestSession,
      events,
    });
  } catch (error) {
    console.error('Error getting latest session events:', error);
    res.status(500).json({ error: 'Failed to get latest session events' });
  }
}

/**
 * Get session workspace files
 */
export async function getSessionWorkspaceFiles(req: Request, res: Response) {
  const sessionId = req.query.sessionId as string;
  const requestPath = (req.query.path as string) || '/';

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const server = req.app.locals.server;
    const session = server.sessions[sessionId];

    // Check if session exists (active or stored)
    if (!session && server.storageProvider) {
      const metadata = await server.storageProvider.getSessionMetadata(sessionId);
      if (!metadata) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const isolateSessions = server.appConfig.workspace?.isolateSessions ?? false;
    const baseWorkspacePath = server.workspacePath || process.cwd();

    // Build potential file paths
    const pathsToCheck: string[] = [];

    if (isolateSessions) {
      pathsToCheck.push(path.join(baseWorkspacePath, sessionId, requestPath));
    }
    pathsToCheck.push(path.join(baseWorkspacePath, requestPath));

    // Find the first existing path
    let targetPath: string | null = null;
    for (const checkPath of pathsToCheck) {
      const normalizedPath = path.resolve(checkPath);
      const normalizedWorkspace = path.resolve(baseWorkspacePath);

      // Security check
      if (normalizedPath.startsWith(normalizedWorkspace) && fs.existsSync(normalizedPath)) {
        targetPath = normalizedPath;
        break;
      }
    }

    if (!targetPath) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stats = fs.statSync(targetPath);

    if (stats.isFile()) {
      // Return file info
      return res.json({
        type: 'file',
        name: path.basename(targetPath),
        size: stats.size,
        modified: stats.mtime,
        path: requestPath,
      });
    } else if (stats.isDirectory()) {
      // Return directory listing
      const files = fs.readdirSync(targetPath).map((file) => {
        const filePath = path.join(targetPath, file);
        const fileStats = fs.statSync(filePath);
        return {
          name: file,
          isDirectory: fileStats.isDirectory(),
          size: fileStats.size,
          modified: fileStats.mtime,
          path: path.join(requestPath, file).replace(/\\/g, '/'),
        };
      });

      return res.json({
        type: 'directory',
        path: requestPath,
        files: files.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        }),
      });
    }

    return res.status(400).json({ error: 'Invalid path type' });
  } catch (error) {
    console.error(`Error accessing workspace files for session ${sessionId}:`, error);
    res.status(500).json({
      error: 'Failed to access workspace files',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
