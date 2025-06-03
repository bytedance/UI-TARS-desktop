import { Socket } from 'socket.io';
import { AgentTARSServer } from '../server';

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
  static handleConnection(socket: Socket, server: AgentTARSServer) {
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

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  }

  /**
   * Handle session joining
   */
  static handleJoinSession(socket: Socket, server: AgentTARSServer, sessionId: string) {
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
    server: AgentTARSServer,
    sessionId: string,
    query: string,
  ) {
    if (server.sessions[sessionId]) {
      try {
        await server.sessions[sessionId].runQuery(query);
      } catch (error) {
        console.error('Error processing query:', error);
        socket.emit('error', 'Failed to process query');
      }
    } else {
      socket.emit('error', 'Session not found');
    }
  }

  /**
   * Handle aborting a query
   */
  static async handleAbortQuery(socket: Socket, server: AgentTARSServer, sessionId: string) {
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
}
