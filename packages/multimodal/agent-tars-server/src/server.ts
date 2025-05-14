/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { AgentTARS } from '@agent-tars/core';
import { EventStreamBridge } from './event-stream';
import { EventType } from '@multimodal/agent';
import { ensureWorkingDirectory, getDefaultAgentConfig } from './utils';

export interface ServerOptions {
  port: number;
}

export class AgentSession {
  id: string;
  agent: AgentTARS;
  eventBridge: EventStreamBridge;
  private unsubscribe: (() => void) | null = null;

  constructor(sessionId: string, workingDirectory: string) {
    this.id = sessionId;
    this.eventBridge = new EventStreamBridge();

    // Initialize agent
    this.agent = new AgentTARS({
      workspace: {
        workingDirectory,
      },
      ...getDefaultAgentConfig(),
    });
  }

  async initialize() {
    await this.agent.initialize();
    // Connect to agent's event stream manager
    const eventStreamManager = this.agent.getEventStream();
    this.unsubscribe = this.eventBridge.connectToAgentEventStream(eventStreamManager);

    // Notify client that session is ready
    this.eventBridge.emit('ready', { sessionId: this.id });
  }

  async runQuery(query: string) {
    try {
      // Create user message event
      const eventStreamManager = this.agent.getEventStream();
      const userEvent = eventStreamManager.createEvent(EventType.USER_MESSAGE, {
        content: query,
      });
      eventStreamManager.addEvent(userEvent);

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

export async function startServer(options: ServerOptions): Promise<http.Server> {
  const { port } = options;
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  // Store active agent sessions
  const sessions: Record<string, AgentSession> = {};

  // Serve API endpoints
  app.use(express.json());

  // Create new agent session
  app.post('/api/sessions', async (req, res) => {
    try {
      const sessionId = `session_${Date.now()}`;
      const workingDirectory = ensureWorkingDirectory(sessionId);

      const session = new AgentSession(sessionId, workingDirectory);
      sessions[sessionId] = session;

      await session.initialize();

      res.status(201).json({ sessionId });
    } catch (error) {
      console.error('Failed to create session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // Send query to specified session
  app.post('/api/sessions/:sessionId/query', async (req, res) => {
    const { sessionId } = req.params;
    const { query } = req.body;

    if (!sessions[sessionId]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    try {
      const result = await sessions[sessionId].runQuery(query);
      res.status(200).json({ result });
    } catch (error) {
      console.error(`Error processing query in session ${sessionId}:`, error);
      res.status(500).json({ error: 'Failed to process query' });
    }
  });

  // WebSocket connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-session', (sessionId) => {
      if (sessions[sessionId]) {
        socket.join(sessionId);
        console.log(`Client ${socket.id} joined session ${sessionId}`);

        // Subscribe to session's event stream
        const eventHandler = (eventType: string, data: any) => {
          socket.emit('agent-event', { type: eventType, data });
        };

        sessions[sessionId].eventBridge.subscribe(eventHandler);

        socket.on('disconnect', () => {
          sessions[sessionId].eventBridge.unsubscribe(eventHandler);
        });
      } else {
        socket.emit('error', 'Session not found');
      }
    });

    socket.on('send-query', async ({ sessionId, query }) => {
      if (sessions[sessionId]) {
        try {
          await sessions[sessionId].runQuery(query);
        } catch (error) {
          console.error('Error processing query:', error);
        }
      } else {
        socket.emit('error', 'Session not found');
      }
    });
  });

  // Start server
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`🚀 Agent TARS Server is running at http://localhost:${port}`);
      resolve(server);
    });
  });
}
