/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { AgentTARS, EventType, AgentTARSOptions } from '@agent-tars/core';
import { EventStreamBridge } from './event-stream';
import { ensureWorkingDirectory } from './utils';

export interface ServerOptions {
  port: number;
  config?: AgentTARSOptions;
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

  /**
   * Create a new Agent TARS Server instance
   * @param options Server configuration options
   */
  constructor(options: ServerOptions) {
    this.port = options.port;
    this.config = options.config || {};
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server);

    this.setupServer();
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
  private setupServer(): void {
    // Serve API endpoints
    this.app.use(express.json());

    // Create new agent session
    this.app.post('/api/sessions', async (req, res) => {
      try {
        const sessionId = `session_${Date.now()}`;
        const workingDirectory = ensureWorkingDirectory(sessionId);

        const session = new AgentSession(sessionId, workingDirectory, this.config);
        this.sessions[sessionId] = session;

        await session.initialize();

        res.status(201).json({ sessionId });
      } catch (error) {
        console.error('Failed to create session:', error);
        res.status(500).json({ error: 'Failed to create session' });
      }
    });

    // Send query to specified session
    this.app.post('/api/sessions/:sessionId/query', async (req, res) => {
      const { sessionId } = req.params;
      const { query } = req.body;

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

/**
 * Legacy function to maintain backward compatibility
 * @deprecated Use the `AgentTARSServer` class directly instead
 */
export async function startServer(options: ServerOptions): Promise<http.Server> {
  const server = new AgentTARSServer(options);
  return server.start();
}
