import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { AgentTARSServer } from '../server';
import { SocketHandlers } from './handlers';

/**
 * Setup WebSocket functionality for the server
 * @param httpServer HTTP server instance
 * @param server AgentTARSServer instance
 * @returns Configured Socket.IO server
 */
export function setupSocketIO(httpServer: http.Server, server: AgentTARSServer): SocketIOServer {
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
