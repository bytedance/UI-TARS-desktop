/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// FIXME: remove express.
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { AgentTARS, EventType, Event, AgentTARSOptions } from '@agent-tars/core';
import { EventStreamBridge } from './event-stream';
import { ensureWorkingDirectory } from './utils';

export interface ServerOptions {
  port: number;
  config?: AgentTARSOptions;
  workspacePath?: string;
  corsOptions?: cors.CorsOptions;
}

export class AgentSession {
  id: string;
  agent: AgentTARS;
  eventBridge: EventStreamBridge;
  private unsubscribe: (() => void) | null = null;

  constructor(sessionId: string, workingDirectory: string, config: AgentTARSOptions = {}) {
    this.id = sessionId;
    this.eventBridge = new EventStreamBridge();

    // Initialize agent with merged config
    this.agent = new AgentTARS({
      ...config,
      workspace: {
        ...(config.workspace || {}),
        workingDirectory,
      },
    });
  }

  async initialize() {
    await this.agent.initialize();
    // Connect to agent's event stream manager
    const agentEventStream = this.agent.getEventStream();
    this.unsubscribe = this.eventBridge.connectToAgentEventStream(agentEventStream);

    // Notify client that session is ready
    this.eventBridge.emit('ready', { sessionId: this.id });
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

  /**
   * Create a new Agent TARS Server instance
   * @param options Server configuration options
   */
  constructor(options: ServerOptions) {
    this.port = options.port;
    this.config = options.config || {};
    this.workspacePath = options.workspacePath;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

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
   */
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

        const session = new AgentSession(sessionId, workingDirectory, this.config);
        this.sessions[sessionId] = session;

        await session.initialize();

        res.status(201).json({ sessionId });
      } catch (error) {
        console.error('Failed to create session:', error);
        res.status(500).json({ error: 'Failed to create session' });
      }
    });

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

    // WebSocket connection handling
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-session', (sessionId) => {
        if (this.sessions[sessionId]) {
          socket.join(sessionId);
          console.log(`Client ${socket.id} joined session ${sessionId}`);

          // Subscribe to session's event stream
          const eventHandler = (eventType: string, data: any) => {
            socket.emit('agent-event', { type: eventType, data });
          };

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
   * Start the server on the configured port
   * @returns Promise resolving with the server instance
   */
  async start(): Promise<http.Server> {
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

    // Clear sessions
    this.sessions = {};

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
