import {
  initializeUI,
  updateProcessingState,
  addSystemMessage,
  addUserMessage,
  getPromptInput,
  clearPromptInput,
} from './ui.js';
import { connectWebSocket, disconnectWebSocket, sendSocketQuery } from './socket.js';
import { handleStreamingResponse } from './messageHandler.js';

/**
 * @type {import('./types.js').SessionInfo}
 */
const sessionInfo = {
  sessionId: null,
  isProcessing: false,
  currentStreamingMessage: null,
};

/**
 * Initialize the application
 */
async function init() {
  // Initialize UI components
  initializeUI();

  addSystemMessage('Creating a new agent session...');

  try {
    // Create a new session via API
    const response = await fetch('/api/sessions/create', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const data = await response.json();
    sessionInfo.sessionId = data.sessionId;

    // Connect to WebSocket
    connectWebSocket(sessionInfo.sessionId);

    addSystemMessage(`Session created: ${sessionInfo.sessionId}`);
  } catch (error) {
    console.error('Error initializing session:', error);
    addSystemMessage('Failed to create agent session. Please refresh and try again.');
  }
}

/**
 * Send a query to the agent
 */
export async function sendQuery() {
  if (sessionInfo.isProcessing || !sessionInfo.sessionId) {
    return;
  }

  const query = getPromptInput();
  if (!query) {
    return;
  }

  clearPromptInput();
  setProcessingState(true);

  try {
    // Reset any current streaming message
    sessionInfo.currentStreamingMessage = null;

    // Add the user message to the UI
    addUserMessage(query);

    // Try to use the streaming endpoint if supported
    try {
      const streamResponse = await fetch('/api/sessions/query/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionInfo.sessionId,
          query,
        }),
      });

      if (
        streamResponse.ok &&
        streamResponse.headers.get('Content-Type')?.includes('text/event-stream')
      ) {
        // Process streaming response
        await handleStreamingResponse(streamResponse);
        setProcessingState(false);
        return;
      }
    } catch (streamError) {
      console.warn('Streaming not supported, falling back to socket.io:', streamError);
    }

    // Fallback to socket.io
    sendSocketQuery(sessionInfo.sessionId, query);
  } catch (error) {
    console.error('Error sending query:', error);
    addSystemMessage('Failed to send query');
    setProcessingState(false);
  }
}

/**
 * Set the processing state
 *
 * @param {boolean} isProcessing - Whether the agent is processing a request
 */
export function setProcessingState(isProcessing) {
  sessionInfo.isProcessing = isProcessing;
  updateProcessingState(isProcessing);
}

/**
 * Get the current session info
 *
 * @returns {import('./types.js').SessionInfo} - The current session info
 */
export function getSessionInfo() {
  return sessionInfo;
}

/**
 * Cleanup function to be called when the page is unloaded
 */
function cleanup() {
  disconnectWebSocket();
}

// Initialize when the page loads
window.addEventListener('load', init);
window.addEventListener('unload', cleanup);
