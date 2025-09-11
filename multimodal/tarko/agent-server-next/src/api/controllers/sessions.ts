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
        sessionInfo = await server.storageProvider.getSessionInfo(sessionId) || undefined;
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
        modelProvider: server.appConfig.model?.provider || 'openai',
        modelId: (server.appConfig.model as any)?.modelId || 'gpt-4',
        metadata: {
          userAgent: c.req.header('user-agent') || 'unknown',
          ipAddress: c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown',
        },
      };

      try {
        savedSessionInfo = await server.storageProvider.saveSessionInfo(sessionInfo);
      } catch (error) {
        console.warn(`Failed to save session info for ${sessionId}:`, error);
      }
    }

    return c.json({
      sessionId,
      status: session.getStatus(),
      sessionInfo: savedSessionInfo,
    }, 201);
  } catch (error) {
    console.error('Failed to create session:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Get session details
 */
export async function getSessionDetails(c: HonoContext) {
  try {
    const server = c.get('server');
    const session = c.get('session');
    const sessionId = c.req.query('sessionId');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    let sessionInfo: SessionInfo | undefined;
    if (server.storageProvider && sessionId) {
      try {
        sessionInfo = await server.storageProvider.getSessionInfo(sessionId) || undefined;
      } catch (error) {
        console.warn(`Failed to get session info for ${sessionId}:`, error);
      }
    }

    return c.json({
      sessionId: session.id,
      status: session.getStatus(),
      sessionInfo,
    }, 200);
  } catch (error) {
    console.error('Failed to get session details:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Get session events
 */
export async function getSessionEvents(c: HonoContext) {
  try {
    const server = c.get('server');
    const sessionId = c.req.query('sessionId');

    if (!sessionId) {
      return c.json({ error: 'Session ID is required' }, 400);
    }

    if (!server.storageProvider) {
      return c.json({ error: 'Storage not configured' }, 503);
    }

    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    const events = await server.storageProvider.getEvents(sessionId, { limit, offset });

    return c.json({ events }, 200);
  } catch (error) {
    console.error('Failed to get session events:', error);
    return c.json(createErrorResponse(error), 500);
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

    const since = parseInt(c.req.query('since') || '0');
    const limit = parseInt(c.req.query('limit') || '50');

    const events = await server.storageProvider.getEvents(sessionId, { 
      limit,
      since: since > 0 ? new Date(since) : undefined 
    });

    return c.json({ events }, 200);
  } catch (error) {
    console.error('Failed to get latest session events:', error);
    return c.json(createErrorResponse(error), 500);
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

    return c.json({
      sessionId: session.id,
      status: session.getStatus(),
    }, 200);
  } catch (error) {
    console.error('Failed to get session status:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Update session metadata
 */
export async function updateSession(c: HonoContext) {
  try {
    const server = c.get('server');
    const session = c.get('session');
    const body = await c.req.json();
    const { metadata } = body;

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (!server.storageProvider) {
      return c.json({ error: 'Storage not configured' }, 503);
    }

    // Update session metadata in storage
    const sessionInfo = await server.storageProvider.getSessionInfo(session.id);
    if (sessionInfo) {
      const updatedSessionInfo = {
        ...sessionInfo,
        metadata: { ...sessionInfo.metadata, ...metadata },
        updatedAt: Date.now(),
      };

      await server.storageProvider.saveSessionInfo(updatedSessionInfo);
      return c.json({ success: true, sessionInfo: updatedSessionInfo }, 200);
    } else {
      return c.json({ error: 'Session info not found' }, 404);
    }
  } catch (error) {
    console.error('Failed to update session:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Delete a session
 */
export async function deleteSession(c: HonoContext) {
  try {
    const server = c.get('server');
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const sessionId = session.id;

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
    console.error('Failed to delete session:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Generate summary for a session
 */
export async function generateSummary(c: HonoContext) {
  try {
    const server = c.get('server');
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (!server.storageProvider) {
      return c.json({ error: 'Storage not configured' }, 503);
    }

    // Get session events for summary generation
    const events = await server.storageProvider.getEvents(session.id, { limit: 1000 });

    // Filter relevant events for summary (user messages and assistant responses)
    const relevantEvents = events.filter((event: any) => 
      ['user_message', 'assistant_message'].includes(event.type)
    );

    if (relevantEvents.length === 0) {
      return c.json({ error: 'No conversation data available for summary' }, 400);
    }

    // Create summary using the agent's generateSummary method
    const messages = relevantEvents.map((event: any) => ({
      role: event.type === 'user_message' ? 'user' as const : 'assistant' as const,
      content: event.content || event.message || '',
    }));

    const summaryRequest = {
      messages: messages as any, // Type assertion for compatibility
      maxTokens: 200,
      temperature: 0.3,
    };

    const summaryResponse = await session.agent.generateSummary(summaryRequest);

    return c.json({
      summary: summaryResponse.summary,
      messageCount: messages.length,
      generatedAt: Date.now(),
    }, 200);
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Share a session
 */
export async function shareSession(c: HonoContext) {
  try {
    const server = c.get('server');
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // For now, return a simple share URL
    // This could be enhanced with proper sharing service integration
    const shareUrl = `${c.req.url.split('/api')[0]}/share/${session.id}`;

    return c.json({
      shareUrl,
      sessionId: session.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    }, 200);
  } catch (error) {
    console.error('Failed to share session:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Get session workspace files
 */
export async function getSessionWorkspaceFiles(c: HonoContext) {
  try {
    const server = c.get('server');
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const workspacePath = server.getCurrentWorkspace();
    const maxDepth = parseInt(c.req.query('maxDepth') || '3');

    // Simple file listing implementation
    const getFiles = (dirPath: string, currentDepth = 0): any[] => {
      if (currentDepth >= maxDepth) return [];

      try {
        const items = fs.readdirSync(dirPath);
        const files: any[] = [];

        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const stats = fs.statSync(fullPath);
          const relativePath = path.relative(workspacePath, fullPath);

          if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            files.push({
              name: item,
              path: relativePath,
              type: 'directory',
              children: getFiles(fullPath, currentDepth + 1),
            });
          } else if (stats.isFile()) {
            files.push({
              name: item,
              path: relativePath,
              type: 'file',
              size: stats.size,
              lastModified: stats.mtime.getTime(),
            });
          }
        }

        return files;
      } catch (error) {
        console.warn(`Failed to read directory ${dirPath}:`, error);
        return [];
      }
    };

    const files = getFiles(workspacePath);

    return c.json({ files, workspacePath }, 200);
  } catch (error) {
    console.error('Failed to get workspace files:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Search workspace items for contextual selector
 */
export async function searchWorkspaceItems(c: HonoContext) {
  try {
    const server = c.get('server');
    const session = c.get('session');
    const query = c.req.query('q') || '';

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (!query) {
      return c.json({ items: [] }, 200);
    }

    const workspacePath = server.getCurrentWorkspace();

    // Simple search implementation
    const searchFiles = (dirPath: string, searchQuery: string): any[] => {
      try {
        const items = fs.readdirSync(dirPath);
        const results: any[] = [];

        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules') continue;

          const fullPath = path.join(dirPath, item);
          const stats = fs.statSync(fullPath);
          const relativePath = path.relative(workspacePath, fullPath);

          if (item.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({
              name: item,
              path: relativePath,
              type: stats.isDirectory() ? 'directory' : 'file',
              size: stats.isFile() ? stats.size : undefined,
            });
          }

          // Recursively search subdirectories (limited depth)
          if (stats.isDirectory() && results.length < 50) {
            results.push(...searchFiles(fullPath, searchQuery));
          }
        }

        return results;
      } catch (error) {
        return [];
      }
    };

    const items = searchFiles(workspacePath, query);

    return c.json({ items: items.slice(0, 20) }, 200); // Limit to 20 results
  } catch (error) {
    console.error('Failed to search workspace items:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Validate workspace paths
 */
export async function validateWorkspacePaths(c: HonoContext) {
  try {
    const server = c.get('server');
    const session = c.get('session');
    const body = await c.req.json();
    const { paths } = body;

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (!Array.isArray(paths)) {
      return c.json({ error: 'Paths must be an array' }, 400);
    }

    const workspacePath = server.getCurrentWorkspace();
    const results = paths.map((relativePath: string) => {
      try {
        const fullPath = path.resolve(workspacePath, relativePath);
        
        // Security check: ensure path is within workspace
        if (!fullPath.startsWith(workspacePath)) {
          return {
            path: relativePath,
            valid: false,
            error: 'Path is outside workspace',
          };
        }

        const stats = fs.statSync(fullPath);
        return {
          path: relativePath,
          valid: true,
          exists: true,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.isFile() ? stats.size : undefined,
        };
      } catch (error) {
        return {
          path: relativePath,
          valid: false,
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    return c.json({ results }, 200);
  } catch (error) {
    console.error('Failed to validate workspace paths:', error);
    return c.json(createErrorResponse(error), 500);
  }
}