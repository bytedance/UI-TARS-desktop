/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { AgentServer } from '../server';
import { handleAgentError } from '../utils/error-handler';

/**
 * Setup WebSocket functionality for the server
 * @param httpServer HTTP server instance
 * @param server AgentServer instance
 * @returns Configured Socket.IO server
 */
export function setupSocketIO(httpServer: http.Server, server: AgentServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Register connection handler
  io.on('connection', (socket) => {
    SocketHandlers.handleConnection(socket, server);
  });

  return io;
}

/**
 * SocketHandlers - Event handlers for WebSocket connections
 *
 * Manages all socket events including:
 * - Connection/disconnection
 * - Session joining
 * - Query sending
 * - Query aborting
 */
export class SocketHandlers {
  /**
   * Handle client connection
   */
  static handleConnection(socket: Socket, server: AgentServer) {
    console.log('Client connected:', socket.id);

    // Register event handlers
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback();
      }
    });

    socket.on('join-session', (sessionId) => {
      SocketHandlers.handleJoinSession(socket, server, sessionId);
    });

    socket.on('send-query', async ({ sessionId, query }) => {
      await SocketHandlers.handleSendQuery(socket, server, sessionId, query);
    });

    socket.on('abort-query', async ({ sessionId }) => {
      await SocketHandlers.handleAbortQuery(socket, server, sessionId);
    });

    socket.on('get-server-status', () => {
      SocketHandlers.handleGetServerStatus(socket, server);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  }

  /**
   * Handle session joining
   */
  static handleJoinSession(socket: Socket, server: AgentServer, sessionId: string) {
    if (server.sessions[sessionId]) {
      socket.join(sessionId);
      console.log(`Client ${socket.id} joined session ${sessionId}`);

      // Subscribe to session's event stream
      const eventHandler = (eventType: string, data: any) => {
        socket.emit('agent-event', { type: eventType, data });
      };

      // Send initial status update immediately after joining
      const initialStatus = {
        isProcessing: server.sessions[sessionId].getProcessingStatus(),
        state: server.sessions[sessionId].agent.status(),
      };
      socket.emit('agent-status', initialStatus);

      server.sessions[sessionId].eventBridge.subscribe(eventHandler);

      socket.on('disconnect', () => {
        if (server.sessions[sessionId]) {
          server.sessions[sessionId].eventBridge.unsubscribe(eventHandler);
        }
      });
    } else {
      socket.emit('error', 'Session not found');
    }
  }

  /**
   * Handle sending a query
   */
  static async handleSendQuery(
    socket: Socket,
    server: AgentServer,
    sessionId: string,
    query: string,
  ) {
    if (server.sessions[sessionId]) {
      try {
        // Use enhanced error handling in runQuery
        const response = await server.sessions[sessionId].runQuery({ input: query });

        if (!response.success && response.error) {
          socket.emit('error', response.error.message);
        }
      } catch (error) {
        // This should never happen with the new error handling
        const handledError = handleAgentError(error);
        console.error('Unexpected error in socket query:', handledError);
        socket.emit('error', handledError.message);
      }
    } else {
      socket.emit('error', 'Session not found');
    }
  }

  /**
   * Handle aborting a query
   */
  static async handleAbortQuery(socket: Socket, server: AgentServer, sessionId: string) {
    if (server.sessions[sessionId]) {
      try {
        const aborted = await server.sessions[sessionId].abortQuery();
        socket.emit('abort-result', { success: aborted });
      } catch (error) {
        console.error('Error aborting query:', error);
        socket.emit('error', 'Failed to abort query');
      }
    } else {
      socket.emit('error', 'Session not found');
    }
  }

  /**
   * Handle getting server status including exclusive mode information
   */
  static handleGetServerStatus(socket: Socket, server: AgentServer) {
    const status = {
      isExclusive: server.isExclusive,
      runningSessionId: server.getRunningSessionId(),
      canAcceptNewRequest: server.canAcceptNewRequest(),
    };

    socket.emit('server-status', status);
  }
}
