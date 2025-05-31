/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// FIXME: remove express.
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import { AgentTARS, EventType, Event, AgentTARSOptions, AgentStatus } from '@agent-tars/core';
import { EventStreamBridge } from './event-stream';
import { ensureWorkingDirectory } from './utils';
import {
  StorageProvider,
  StorageOptions,
  createStorageProvider,
  SessionMetadata,
  FileStorageProvider,
  SQLiteStorageProvider,
} from './storage';

export { express };

export interface ServerOptions {
  port: number;
  config?: AgentTARSOptions;
  workspacePath?: string;
  corsOptions?: cors.CorsOptions;
  isDebug?: boolean;
  storage?: StorageOptions;
  /**
   * Share provider.
   */
  shareProvider?: string;
  /**
   * Web UI static path.
   */
  staticPath?: string;
}

export class AgentSession {
  id: string;
  agent: AgentTARS;
  eventBridge: EventStreamBridge;
  private unsubscribe: (() => void) | null = null;
  private isDebug: boolean;
  private storageProvider: StorageProvider | null = null;

  constructor(
    sessionId: string,
    workingDirectory: string,
    config: AgentTARSOptions = {},
    isDebug = false,
    storageProvider: StorageProvider | null = null,
  ) {
    this.id = sessionId;
    this.eventBridge = new EventStreamBridge();
    this.isDebug = isDebug;
    this.storageProvider = storageProvider;

    // Initialize agent with merged config
    this.agent = new AgentTARS({
      ...config,
      workspace: {
        ...(config.workspace || {}),
        workingDirectory,
      },
    });
  }

  /**
   * Get the current processing status of the agent
   * @returns Whether the agent is currently processing a request
   */
  getProcessingStatus(): boolean {
    return this.agent.status() === AgentStatus.EXECUTING;
  }

  async initialize() {
    await this.agent.initialize();
    // Connect to agent's event stream manager
    const agentEventStream = this.agent.getEventStream();

    // Create an event handler that also saves events to storage
    const handleEvent = async (event: Event) => {
      // If we have storage, save the event
      if (this.storageProvider) {
        try {
          await this.storageProvider.saveEvent(this.id, event);
        } catch (error) {
          console.error(`Failed to save event to storage: ${error}`);
        }
      }
    };

    // Subscribe to events for storage
    const storageUnsubscribe = agentEventStream.subscribe(handleEvent);

    // Connect to event bridge for client communication
    this.unsubscribe = this.eventBridge.connectToAgentEventStream(agentEventStream);

    // Notify client that session is ready
    this.eventBridge.emit('ready', { sessionId: this.id });

    return { storageUnsubscribe };
  }

  async runQuery(query: string) {
    try {
      // Run agent to process the query
      const answer = await this.agent.run(query);
      return answer;
    } catch (error) {
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async runQueryStreaming(query: string): Promise<AsyncIterable<Event>> {
    try {
      // Run agent in streaming mode
      return await this.agent.run({
        input: query,
        stream: true,
      });
    } catch (error) {
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Abort the currently running query
   * @returns True if the agent was running and aborted successfully
   */
  async abortQuery(): Promise<boolean> {
    try {
      const aborted = this.agent.abort();
      if (aborted) {
        this.eventBridge.emit('aborted', { sessionId: this.id });
      }
      return aborted;
    } catch (error) {
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async cleanup() {
    // Unsubscribe from event stream
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Clean up agent resources
    await this.agent.cleanup();
    this.eventBridge.emit('closed', { sessionId: this.id });
  }
}

/**
 * Agent TARS Server class that provides an encapsulated interface
 * for creating and managing the server instance
 */
export class AgentTARSServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private sessions: Record<string, AgentSession> = {};
  private isRunning = false;
  private port: number;
  private config: AgentTARSOptions;
  private workspacePath?: string;
  private isDebug: boolean;
  private storageProvider: StorageProvider | null = null;
  private storageUnsubscribes: Record<string, () => void> = {};

  /**
   * Create a new Agent TARS Server instance
   * @param options Server configuration options
   */
  constructor(private options: ServerOptions) {
    this.port = options.port;
    this.config = options.config || {};
    this.workspacePath = options.workspacePath;
    this.isDebug = options.isDebug || false;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Initialize storage if provided
    if (options.storage) {
      this.storageProvider = createStorageProvider(options.storage);
    }

    this.setupServer(options.corsOptions);
  }

  /**
   * Get the Express application instance
   * @returns Express application
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the HTTP server instance
   * @returns HTTP server
   */
  getHttpServer(): http.Server {
    return this.server;
  }

  /**
   * Get the Socket.IO server instance
   * @returns Socket.IO server
   */
  getSocketIOServer(): SocketIOServer {
    return this.io;
  }

  /**
   * Check if the server is currently running
   * @returns True if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get an active session by ID
   * @param sessionId The session ID to retrieve
   * @returns The agent session or undefined if not found
   
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions[sessionId];
  }

  /**
   * Get all active sessions
   * @returns Record of all sessions
   */
  getAllSessions(): Record<string, AgentSession> {
    return { ...this.sessions };
  }

  /**
   * Get storage information if available
   * @returns Object containing storage type and path (if applicable)
   */
  getStorageInfo(): { type: string; path?: string } {
    if (!this.storageProvider) {
      return { type: 'none' };
    }

    if (this.storageProvider instanceof FileStorageProvider) {
      return {
        type: 'file',
        path: this.storageProvider.dbPath,
      };
    }

    if (this.storageProvider instanceof SQLiteStorageProvider) {
      return {
        type: 'sqlite',
        path: this.storageProvider.dbPath,
      };
    }

    // For other storage types
    return {
      type: this.storageProvider.constructor.name.replace('StorageProvider', '').toLowerCase(),
    };
  }

  /**
   * Set up server routes and socket handlers
   * @private
   */
  private setupServer(corsOptions?: cors.CorsOptions): void {
    // 启用 CORS
    this.app.use(
      cors(
        corsOptions || {
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
        },
      ),
    );

    // Serve API endpoints
    this.app.use(express.json());

    // Add health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Add API endpoint to get session status
    this.app.get('/api/sessions/status', async (req, res) => {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      try {
        const session = this.sessions[sessionId];
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
    });

    this.app.post('/api/sessions/create', async (req, res) => {
      try {
        const sessionId = `session_${Date.now()}`;
        // Use config.workspace?.isolateSessions (defaulting to false) to determine directory isolation
        const isolateSessions = this.config.workspace?.isolateSessions ?? false;
        const workingDirectory = ensureWorkingDirectory(
          sessionId,
          this.workspacePath,
          isolateSessions,
        );

        const session = new AgentSession(
          sessionId,
          workingDirectory,
          this.config,
          this.isDebug,
          this.storageProvider,
        );

        this.sessions[sessionId] = session;

        const { storageUnsubscribe } = await session.initialize();

        // Save unsubscribe function for cleanup
        if (storageUnsubscribe) {
          this.storageUnsubscribes[sessionId] = storageUnsubscribe;
        }

        // Store session metadata if we have storage
        if (this.storageProvider) {
          const metadata: SessionMetadata = {
            id: sessionId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            workingDirectory,
          };

          await this.storageProvider.createSession(metadata);
        }

        res.status(201).json({ sessionId });
      } catch (error) {
        console.error('Failed to create session:', error);
        res.status(500).json({ error: 'Failed to create session' });
      }
    });

    // Get all sessions
    this.app.get('/api/sessions', async (req, res) => {
      try {
        if (!this.storageProvider) {
          // If no storage, return only active sessions
          const activeSessions = Object.keys(this.sessions).map((id) => ({
            id,
            createdAt: Date.now(), // We don't know the actual time without storage
            updatedAt: Date.now(),
            active: true,
          }));
          return res.status(200).json({ sessions: activeSessions });
        }

        // Get all sessions from storage
        const sessions = await this.storageProvider.getAllSessions();

        // Add 'active' flag to sessions
        const enrichedSessions = sessions.map((session) => ({
          ...session,
          active: !!this.sessions[session.id],
        }));

        res.status(200).json({ sessions: enrichedSessions });
      } catch (error) {
        console.error('Failed to get sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
      }
    });

    // Get session details
    this.app.get('/api/sessions/details', async (req, res) => {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      try {
        // Check storage first
        if (this.storageProvider) {
          const metadata = await this.storageProvider.getSessionMetadata(sessionId);
          if (metadata) {
            // Session exists in storage
            return res.status(200).json({
              session: {
                ...metadata,
                active: !!this.sessions[sessionId],
              },
            });
          }
        }

        // Check active sessions
        if (this.sessions[sessionId]) {
          return res.status(200).json({
            session: {
              id: sessionId,
              createdAt: Date.now(), // Placeholder since we don't have actual time
              updatedAt: Date.now(),
              workingDirectory: this.sessions[sessionId].agent.getWorkingDirectory(),
              active: true,
            },
          });
        }

        return res.status(404).json({ error: 'Session not found' });
      } catch (error) {
        console.error(`Error getting session details for ${sessionId}:`, error);
        res.status(500).json({ error: 'Failed to get session details' });
      }
    });

    // Get session events
    this.app.get('/api/sessions/events', async (req, res) => {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      try {
        if (!this.storageProvider) {
          return res.status(404).json({ error: 'Storage not configured, no events available' });
        }

        const events = await this.storageProvider.getSessionEvents(sessionId);
        res.status(200).json({ events });
      } catch (error) {
        console.error(`Error getting events for session ${sessionId}:`, error);
        res.status(500).json({ error: 'Failed to get session events' });
      }
    });

    // Update session metadata
    this.app.post('/api/sessions/update', async (req, res) => {
      const { sessionId, name, tags } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      try {
        if (!this.storageProvider) {
          return res.status(404).json({ error: 'Storage not configured, cannot update session' });
        }

        const metadata = await this.storageProvider.getSessionMetadata(sessionId);
        if (!metadata) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const updatedMetadata = await this.storageProvider.updateSessionMetadata(sessionId, {
          name,
          tags,
          updatedAt: Date.now(),
        });

        res.status(200).json({ session: updatedMetadata });
      } catch (error) {
        console.error(`Error updating session ${sessionId}:`, error);
        res.status(500).json({ error: 'Failed to update session' });
      }
    });

    // Delete session
    this.app.post('/api/sessions/delete', async (req, res) => {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      try {
        // Close active session if exists
        if (this.sessions[sessionId]) {
          await this.sessions[sessionId].cleanup();
          delete this.sessions[sessionId];

          // Clean up storage unsubscribe
          if (this.storageUnsubscribes[sessionId]) {
            this.storageUnsubscribes[sessionId]();
            delete this.storageUnsubscribes[sessionId];
          }
        }

        // Delete from storage if configured
        if (this.storageProvider) {
          const deleted = await this.storageProvider.deleteSession(sessionId);
          if (!deleted) {
            return res.status(404).json({ error: 'Session not found in storage' });
          }
        }

        res.status(200).json({ success: true });
      } catch (error) {
        console.error(`Error deleting session ${sessionId}:`, error);
        res.status(500).json({ error: 'Failed to delete session' });
      }
    });

    // Restore session from storage
    this.app.post('/api/sessions/restore', async (req, res) => {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      try {
        // Check if session is already active
        if (this.sessions[sessionId]) {
          return res.status(400).json({ error: 'Session is already active' });
        }

        // Check if we have storage
        if (!this.storageProvider) {
          return res.status(404).json({ error: 'Storage not configured, cannot restore session' });
        }

        // Get session metadata from storage
        const metadata = await this.storageProvider.getSessionMetadata(sessionId);
        if (!metadata) {
          return res.status(404).json({ error: 'Session not found in storage' });
        }

        // Create a new active session
        const session = new AgentSession(
          sessionId,
          metadata.workingDirectory,
          this.config,
          this.isDebug,
          this.storageProvider,
        );

        this.sessions[sessionId] = session;
        const { storageUnsubscribe } = await session.initialize();

        // Save unsubscribe function
        if (storageUnsubscribe) {
          this.storageUnsubscribes[sessionId] = storageUnsubscribe;
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
    });

    // Add existing endpoints for query, streaming, and abort

    this.app.post('/api/sessions/query/stream', async (req, res) => {
      const { sessionId, query } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      if (!this.sessions[sessionId]) {
        return res.status(404).json({ error: 'Session not found' });
      }

      try {
        // Set response headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Get streaming response
        const eventStream = await this.sessions[sessionId].runQueryStreaming(query);

        // Stream events one by one
        for await (const event of eventStream) {
          // Only send data when connection is still open
          if (!res.closed) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          } else {
            break;
          }
        }

        // End the stream response
        if (!res.closed) {
          res.end();
        }
      } catch (error) {
        console.error(`Error processing streaming query in session ${sessionId}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to process streaming query' });
        } else {
          res.write(`data: ${JSON.stringify({ error: 'Failed to process streaming query' })}\n\n`);
          res.end();
        }
      }
    });

    // New RESTful endpoint for non-streaming query
    this.app.post('/api/sessions/query', async (req, res) => {
      const { sessionId, query } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      if (!this.sessions[sessionId]) {
        return res.status(404).json({ error: 'Session not found' });
      }

      try {
        const result = await this.sessions[sessionId].runQuery(query);
        res.status(200).json({ result });
      } catch (error) {
        console.error(`Error processing query in session ${sessionId}:`, error);
        res.status(500).json({ error: 'Failed to process query' });
      }
    });
    // RESTful endpoint for abort functionality
    this.app.post('/api/sessions/abort', async (req, res) => {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      if (!this.sessions[sessionId]) {
        return res.status(404).json({ error: 'Session not found' });
      }

      try {
        const aborted = await this.sessions[sessionId].abortQuery();
        res.status(200).json({ success: aborted });
      } catch (error) {
        console.error(`Error aborting query in session ${sessionId}:`, error);
        res.status(500).json({ error: 'Failed to abort query' });
      }
    });

    this.app.post('/api/sessions/generate-summary', async (req, res) => {
      const { sessionId, messages, model, provider } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages are required' });
      }

      try {
        const session = this.sessions[sessionId];
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
    });

    // 添加一个新的API端点来获取浏览器控制模式信息
    this.app.get('/api/sessions/browser-control', async (req, res) => {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      try {
        const session = this.sessions[sessionId];
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
    });

    // 生成分享 HTML 和分享链接的端点
    this.app.post('/api/sessions/share', async (req, res) => {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      try {
        // 验证会话存在于存储中
        if (this.storageProvider) {
          const metadata = await this.storageProvider.getSessionMetadata(sessionId);
          if (!metadata) {
            return res.status(404).json({ error: 'Session not found' });
          }

          // 获取会话事件
          const events = await this.storageProvider.getSessionEvents(sessionId);

          // 生成 HTML 内容
          const shareHtml = this.generateShareHtml(events, metadata);

          // 如果有配置分享提供者，则上传 HTML
          if (req.body.upload && this.options.shareProvider) {
            try {
              const shareUrl = await this.uploadShareHtml(shareHtml, sessionId);
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
    });

    // 新增: 获取分享配置
    this.app.get('/api/share/config', (req, res) => {
      res.status(200).json({
        hasShareProvider: !!this.options.shareProvider,
        shareProvider: this.options.shareProvider || null,
      });
    });

    // WebSocket connection handling
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('ping', (callback) => {
        if (typeof callback === 'function') {
          callback();
        }
      });

      socket.on('join-session', (sessionId) => {
        if (this.sessions[sessionId]) {
          socket.join(sessionId);
          console.log(`Client ${socket.id} joined session ${sessionId}`);

          // Subscribe to session's event stream
          const eventHandler = (eventType: string, data: any) => {
            socket.emit('agent-event', { type: eventType, data });
          };

          // Send initial status update immediately after joining
          const initialStatus = {
            isProcessing: this.sessions[sessionId].getProcessingStatus(),
            state: this.sessions[sessionId].agent.status(),
          };
          socket.emit('agent-status', initialStatus);

          this.sessions[sessionId].eventBridge.subscribe(eventHandler);

          socket.on('disconnect', () => {
            if (this.sessions[sessionId]) {
              this.sessions[sessionId].eventBridge.unsubscribe(eventHandler);
            }
          });
        } else {
          socket.emit('error', 'Session not found');
        }
      });

      socket.on('send-query', async ({ sessionId, query }) => {
        if (this.sessions[sessionId]) {
          try {
            await this.sessions[sessionId].runQuery(query);
          } catch (error) {
            console.error('Error processing query:', error);
          }
        } else {
          socket.emit('error', 'Session not found');
        }
      });

      socket.on('abort-query', async ({ sessionId }) => {
        if (this.sessions[sessionId]) {
          try {
            const aborted = await this.sessions[sessionId].abortQuery();
            socket.emit('abort-result', { success: aborted });
          } catch (error) {
            console.error('Error aborting query:', error);
            socket.emit('error', 'Failed to abort query');
          }
        } else {
          socket.emit('error', 'Session not found');
        }
      });
    });
  }

  /**
   * 生成可分享的 HTML 内容
   * @private
   */
  private generateShareHtml(events: Event[], metadata: SessionMetadata): string {
    if (!this.options.staticPath) {
      throw new Error('Cannot found static path.');
    }

    const indexPath = path.join(this.options.staticPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error('Static web ui not found.');
    }

    try {
      let htmlContent = fs.readFileSync(indexPath, 'utf8');

      // 注入会话数据和事件流
      const scriptTag = `<script>
        window.AGENT_TARS_REPLAY_MODE = true;
        window.AGENT_TARS_SESSION_DATA = ${JSON.stringify(metadata)};
        window.AGENT_TARS_EVENT_STREAM = ${JSON.stringify(events)};
      </script>
      <script>
        // Add a fallback mechanism for when routes don't match in shared HTML files
        window.addEventListener('DOMContentLoaded', function() {
          // Give React time to attempt normal routing
          setTimeout(function() {
            const root = document.getElementById('root');
            if (root && (!root.children || root.children.length === 0)) {
              console.log('[ReplayMode] No content rendered, applying fallback');
              // Try to force the app to re-render if no content is displayed
              window.dispatchEvent(new Event('resize'));
            }
          }, 1000);
        });
      </script>`;

      // 插入脚本到 head 结束标签前
      htmlContent = htmlContent.replace('</head>', `${scriptTag}\n</head>`);

      return htmlContent;
    } catch (error) {
      console.error('Failed to generate share HTML:', error);
      throw new Error(
        `Failed to generate share HTML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 上传 HTML 到分享提供者
   * @private
   */
  private async uploadShareHtml(html: string, sessionId: string): Promise<string> {
    if (!this.options.shareProvider) {
      throw new Error('Share provider not configured');
    }

    try {
      // 创建临时文件
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const axios = require('axios');
      const FormData = require('form-data');

      const tempDir = path.join(os.tmpdir(), 'agent-tars-share');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `agent-tars-${sessionId}-${Date.now()}.html`;
      const filePath = path.join(tempDir, fileName);

      // 写入 HTML 内容到临时文件
      fs.writeFileSync(filePath, html);

      // 创建表单数据
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('sessionId', sessionId);

      // 发送请求到分享提供者
      const response = await axios.post(this.options.shareProvider, form, {
        headers: {
          ...form.getHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });

      // 清理临时文件
      fs.unlinkSync(filePath);

      // 返回分享 URL
      if (response.data && response.data.url) {
        return response.data.url;
      }

      throw new Error('Invalid response from share provider');
    } catch (error) {
      console.error('Failed to upload share HTML:', error);
      throw error;
    }
  }

  /**
   * Start the server on the configured port
   * @returns Promise resolving with the server instance
   */
  async start(): Promise<http.Server> {
    // Initialize storage if available
    if (this.storageProvider) {
      try {
        await this.storageProvider.initialize();
      } catch (error) {
        console.error('Failed to initialize storage provider:', error);
      }
    }

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🚀 Agent TARS Server is running at http://localhost:${this.port}`);
        this.isRunning = true;
        resolve(this.server);
      });
    });
  }

  /**
   * Stop the server and clean up all resources
   * @returns Promise resolving when server is stopped
   */
  async stop(): Promise<void> {
    // Clean up all active sessions
    const sessionCleanup = Object.values(this.sessions).map((session) => session.cleanup());
    await Promise.all(sessionCleanup);

    // Clean up all storage unsubscribes
    Object.values(this.storageUnsubscribes).forEach((unsubscribe) => unsubscribe());
    this.storageUnsubscribes = {};

    // Clear sessions
    this.sessions = {};

    // Close storage provider
    if (this.storageProvider) {
      await this.storageProvider.close();
    }

    // Close server if running
    if (this.isRunning) {
      return new Promise((resolve, reject) => {
        this.server.close((err) => {
          if (err) {
            reject(err);
            return;
          }

          this.isRunning = false;
          console.log('Server stopped');
          resolve();
        });
      });
    }

    return Promise.resolve();
  }
}
