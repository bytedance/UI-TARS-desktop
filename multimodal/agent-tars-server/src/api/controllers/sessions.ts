import { Request, Response } from 'express';
import { AgentTARSServer } from '../../server';
import { ensureWorkingDirectory } from '../../utils/workspace';
import { EventType } from '@agent-tars/core';
import { SessionMetadata } from '../../storage';

/**
 * SessionsController - Handles all session-related API endpoints
 *
 * Responsible for:
 * - Session creation, retrieval, updating, and deletion
 * - Session details and events fetching
 * - Session status monitoring
 * - Session sharing functionality
 */
export class SessionsController {
  /**
   * Get all sessions
   */
  async getAllSessions(req: Request, res: Response) {
    try {
      const server = req.app.locals.server as AgentTARSServer;

      if (!server.storageProvider) {
        // If no storage, return only active sessions
        const activeSessions = Object.keys(server.sessions).map((id) => ({
          id,
          createdAt: Date.now(), // We don't know the actual time without storage
          updatedAt: Date.now(),
          active: true,
        }));
        return res.status(200).json({ sessions: activeSessions });
      }

      // Get all sessions from storage
      const sessions = await server.storageProvider.getAllSessions();

      // Add 'active' flag to sessions
      const enrichedSessions = sessions.map((session) => ({
        ...session,
        active: !!server.sessions[session.id],
      }));

      res.status(200).json({ sessions: enrichedSessions });
    } catch (error) {
      console.error('Failed to get sessions:', error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }

  /**
   * Create a new session
   */
  async createSession(req: Request, res: Response) {
    try {
      const server = req.app.locals.server as AgentTARSServer;
      const sessionId = `session_${Date.now()}`;

      // Use config.workspace?.isolateSessions (defaulting to false) to determine directory isolation
      const isolateSessions = server.config.workspace?.isolateSessions ?? false;
      const workingDirectory = ensureWorkingDirectory(
        sessionId,
        server.workspacePath,
        isolateSessions,
      );

      const session = new server.AgentSession(
        sessionId,
        workingDirectory,
        server.config,
        server.isDebug,
        server.storageProvider,
        server.options.snapshot,
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
   * Get session details
   */
  async getSessionDetails(req: Request, res: Response) {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      const server = req.app.locals.server as AgentTARSServer;

      // Check storage first
      if (server.storageProvider) {
        const metadata = await server.storageProvider.getSessionMetadata(sessionId);
        if (metadata) {
          // Session exists in storage
          return res.status(200).json({
            session: {
              ...metadata,
              active: !!server.sessions[sessionId],
            },
          });
        }
      }

      // Check active sessions
      if (server.sessions[sessionId]) {
        return res.status(200).json({
          session: {
            id: sessionId,
            createdAt: Date.now(), // Placeholder since we don't have actual time
            updatedAt: Date.now(),
            workingDirectory: server.sessions[sessionId].agent.getWorkingDirectory(),
            active: true,
          },
        });
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
  async getSessionEvents(req: Request, res: Response) {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      const server = req.app.locals.server as AgentTARSServer;

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
  async getSessionStatus(req: Request, res: Response) {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      const server = req.app.locals.server as AgentTARSServer;
      const session = server.sessions[sessionId];

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

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
  async updateSession(req: Request, res: Response) {
    const { sessionId, name, tags } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      const server = req.app.locals.server as AgentTARSServer;

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
  async deleteSession(req: Request, res: Response) {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      const server = req.app.locals.server as AgentTARSServer;

      // Close active session if exists
      if (server.sessions[sessionId]) {
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
   * Restore a session
   */
  async restoreSession(req: Request, res: Response) {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      const server = req.app.locals.server as AgentTARSServer;

      // Check if session is already active
      if (server.sessions[sessionId]) {
        return res.status(400).json({ error: 'Session is already active' });
      }

      // Check if we have storage
      if (!server.storageProvider) {
        return res.status(404).json({ error: 'Storage not configured, cannot restore session' });
      }

      // Get session metadata from storage
      const metadata = await server.storageProvider.getSessionMetadata(sessionId);
      if (!metadata) {
        return res.status(404).json({ error: 'Session not found in storage' });
      }

      // Create a new active session
      const session = new server.AgentSession(
        sessionId,
        metadata.workingDirectory,
        server.config,
        server.isDebug,
        server.storageProvider,
        server.options.snapshot,
      );

      server.sessions[sessionId] = session;
      const { storageUnsubscribe } = await session.initialize();

      // Save unsubscribe function
      if (storageUnsubscribe) {
        server.storageUnsubscribes[sessionId] = storageUnsubscribe;
      }

      res.status(200).json({
        success: true,
        session: {
          ...metadata,
          active: true,
        },
      });
    } catch (error) {
      console.error(`Error restoring session ${sessionId}:`, error);
      res.status(500).json({ error: 'Failed to restore session' });
    }
  }

  /**
   * Generate summary for a session
   */
  async generateSummary(req: Request, res: Response) {
    const { sessionId, messages, model, provider } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    try {
      const server = req.app.locals.server as AgentTARSServer;
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
   * Get browser control information
   */
  async getBrowserControlInfo(req: Request, res: Response) {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      const server = req.app.locals.server as AgentTARSServer;
      const session = server.sessions[sessionId];

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // 获取浏览器控制模式信息 - 这需要在Agent中添加方法
      const browserControlInfo = await session.agent.getBrowserControlInfo();

      res.status(200).json(browserControlInfo);
    } catch (error) {
      console.error(`Error getting browser control info (${sessionId}):`, error);
      res.status(500).json({ error: 'Failed to get browser control info' });
    }
  }

  /**
   * Share a session
   */
  async shareSession(req: Request, res: Response) {
    const { sessionId, upload } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      const server = req.app.locals.server as AgentTARSServer;

      // 验证会话存在于存储中
      if (server.storageProvider) {
        const metadata = await server.storageProvider.getSessionMetadata(sessionId);
        if (!metadata) {
          return res.status(404).json({ error: 'Session not found' });
        }

        // 获取会话事件
        const events = await server.storageProvider.getSessionEvents(sessionId);

        // 过滤出关键帧事件，排除流式消息
        const keyFrameEvents = events.filter(
          (event) =>
            event.type !== EventType.ASSISTANT_STREAMING_MESSAGE &&
            event.type !== EventType.ASSISTANT_STREAMING_THINKING_MESSAGE &&
            event.type !== EventType.FINAL_ANSWER_STREAMING,
        );

        // 生成 HTML 内容
        const shareHtml = server.generateShareHtml(keyFrameEvents, metadata);

        // 如果有配置分享提供者，则上传 HTML
        if (upload && server.options.shareProvider) {
          try {
            const shareUrl = await server.uploadShareHtml(shareHtml, sessionId);
            return res.status(200).json({
              success: true,
              url: shareUrl,
              sessionId,
            });
          } catch (uploadError) {
            return res.status(500).json({
              error: 'Failed to upload share HTML',
              message: uploadError instanceof Error ? uploadError.message : String(uploadError),
            });
          }
        }

        // 如果没有上传或没有配置分享提供者，则返回 HTML 内容
        return res.status(200).json({
          success: true,
          html: shareHtml,
          sessionId,
        });
      }

      return res.status(404).json({ error: 'Storage not configured, cannot share session' });
    } catch (error) {
      console.error(`Error sharing session ${sessionId}:`, error);
      return res.status(500).json({ error: 'Failed to share session' });
    }
  }
}

export const sessionsController = new SessionsController();
