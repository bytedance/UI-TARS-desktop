import { io, Socket } from 'socket.io-client';
import type { AgentIntermediateState } from '../types/chat';

/**
 * Configuration options for Agent TARS service
 */
interface AgentServiceConfig {
  baseUrl: string;
  apiPath?: string;
  wsPath?: string;
}

/**
 * Agent service class for interacting with Agent TARS server
 * Handles both HTTP API calls and WebSocket communication
 */
export class AgentService {
  private baseUrl: string;
  private apiPath: string;
  private wsPath: string;
  private socket: Socket | null = null;
  private activeSessionId: string | null = null;

  constructor(config: AgentServiceConfig) {
    this.baseUrl = config.baseUrl || window.location.origin;
    this.apiPath = config.apiPath || '/api';
    this.wsPath = config.wsPath || '';
  }

  /**
   * Create a new agent session
   * @returns Promise with created session id
   */
  async createSession(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/sessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.activeSessionId = data.sessionId;
      return data.sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get or create an active session ID
   * @returns Promise with session id
   */
  async getOrCreateSessionId(): Promise<string> {
    if (!this.activeSessionId) {
      return await this.createSession();
    }
    return this.activeSessionId;
  }

  /**
   * Connect to WebSocket server for real-time updates
   * @param sessionId - The session ID to connect to
   * @param onEvent - Callback for agent event updates
   * @returns Cleanup function to disconnect
   */
  connectToSession(sessionId: string, onEvent: (event: any) => void): () => void {
    if (this.socket) {
      this.socket.disconnect();
    }

    // Connect to socket.io server
    this.socket = io(this.baseUrl, {
      path: this.wsPath || undefined,
    });

    // Setup event handlers
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.socket?.emit('join-session', sessionId);
    });

    this.socket.on('agent-event', (data) => {
      onEvent(data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Return cleanup function
    return () => {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    };
  }

  /**
   * Send a query to the agent using streaming API
   * @param sessionId - The session ID
   * @param query - The user query
   * @param onEvent - Callback for processing stream events
   * @param onError - Callback for error handling
   * @returns Promise that resolves when stream completes
   */
  async streamQuery(
    sessionId: string,
    query: string,
    onEvent: (event: any) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/sessions/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query }),
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
      }

      // Process the server-sent events stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      // Reading the stream
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete events in buffer
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              onEvent(eventData);
            } catch (e) {
              console.error('Failed to parse event data:', e, line);
            }
          }
        }
      }

      // Process any remaining data in the buffer
      if (buffer && buffer.startsWith('data: ')) {
        try {
          const eventData = JSON.parse(buffer.substring(6));
          onEvent(eventData);
        } catch (e) {
          console.error('Failed to parse event data:', e, buffer);
        }
      }
    } catch (error) {
      console.error('Error in stream query:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Send a query to the agent (non-streaming)
   * @param sessionId - The session ID
   * @param query - The user query
   * @returns Promise with the agent response
   */
  async sendQuery(sessionId: string, query: string): Promise<{ result: string }> {
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/sessions/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query }),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending query:', error);
      throw error;
    }
  }

  /**
   * Send a query via WebSocket
   * @param sessionId - The session ID
   * @param query - The user query
   */
  sendSocketQuery(sessionId: string, query: string): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('send-query', { sessionId, query });
  }
}

/**
 * Create and configure the default agent service instance
 */
export const createAgentService = (): AgentService => {
  const baseUrl =
    process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3000';
  return new AgentService({
    baseUrl,
    apiPath: '/api',
    wsPath: '/socket.io',
  });
};

// Default singleton instance
export const agentService = createAgentService();
