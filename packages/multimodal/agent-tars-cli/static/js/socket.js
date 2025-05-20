import { handleAgentEvent } from './events.js';
import { updateConnectionStatus } from './ui.js';
import { logEvent } from './messageHandler.js';

/**
 * @type {import('socket.io-client').Socket|null}
 */
let socket = null;

/**
 * Initializes and connects the WebSocket for communication with the Agent
 *
 * @param {string} sessionId - The current session ID
 * @returns {import('socket.io-client').Socket} - The socket.io connection
 */
export function connectWebSocket(sessionId) {
  // Create socket.io connection
  socket = io();

  // Event handlers
  socket.on('connect', () => {
    updateConnectionStatus(true);

    if (sessionId) {
      socket.emit('join-session', sessionId);
    }
  });

  socket.on('disconnect', () => {
    updateConnectionStatus(false);
  });

  socket.on('agent-event', (event) => {
    // Log all events to events panel
    logEvent(event);

    // Process event for chat panel
    handleAgentEvent(event);
  });

  socket.on('error', (message) => {
    const errorEvent = {
      type: 'error',
      data: { message },
    };

    logEvent(errorEvent);
    handleAgentEvent(errorEvent);
  });

  return socket;
}

/**
 * Disconnects the WebSocket
 */
export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Sends a query to the agent via WebSocket
 *
 * @param {string} sessionId - The current session ID
 * @param {string} query - The user's query
 */
export function sendSocketQuery(sessionId, query) {
  if (socket) {
    socket.emit('send-query', { sessionId, query });
  }
}

/**
 * Gets the current socket connection
 *
 * @returns {import('socket.io-client').Socket|null} - The current socket connection
 */
export function getSocket() {
  return socket;
}
