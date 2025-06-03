import { API_BASE_URL, API_ENDPOINTS } from '../constants';
import { Event, SessionInfo, SessionMetadata } from '../types';
import { socketService } from './socketService';
import { ChatCompletionContentPart } from '@multimodal/agent-interface';

/**
 * API Service - Handles HTTP requests to the Agent TARS Server
 *
 * Provides methods for:
 * - Session management (create, get, update, delete)
 * - Query execution (streaming and non-streaming)
 * - Server health checks
 */
class ApiService {
  /**
   * Check server health status
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      // Try ping through socket if connected
      if (socketService.isConnected()) {
        const pingSuccessful = await socketService.ping();
        if (pingSuccessful) return true;
      }

      // Fall back to API health endpoint
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.HEALTH}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      return response.ok;
    } catch (error) {
      console.error('Error checking server health:', error);
      return false;
    }
  }

  /**
   * Create a new session
   */
  async createSession(): Promise<SessionInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CREATE_SESSION}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const { sessionId } = await response.json();
      return this.getSessionDetails(sessionId);
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get all sessions
   */
  async getSessions(): Promise<SessionInfo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SESSIONS}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to get sessions: ${response.statusText}`);
      }

      const { sessions } = await response.json();
      return sessions;
    } catch (error) {
      console.error('Error getting sessions:', error);
      throw error;
    }
  }

  /**
   * Get details for a specific session
   */
  async getSessionDetails(sessionId: string): Promise<SessionInfo> {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SESSION_DETAILS}?sessionId=${sessionId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000), // 添加 5 秒超时
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get session details: ${response.statusText}`);
      }

      const { session } = await response.json();
      return session;
    } catch (error) {
      console.error(`Error getting session details (${sessionId}):`, error);
      throw error;
    }
  }

  /**
   * Get events for a specific session
   */
  async getSessionEvents(sessionId: string): Promise<Event[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SESSION_EVENTS}?sessionId=${sessionId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000), // 添加 5 秒超时
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get session events: ${response.statusText}`);
      }

      const { events } = await response.json();
      return events;
    } catch (error) {
      console.error(`Error getting session events (${sessionId}):`, error);
      throw error;
    }
  }

  /**
   * Get current status of a session
   */
  async getSessionStatus(sessionId: string): Promise<{ isProcessing: boolean; state: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SESSION_STATUS}?sessionId=${sessionId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000), // 3 second timeout
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get session status: ${response.statusText}`);
      }

      const { status } = await response.json();
      return status;
    } catch (error) {
      console.error(`Error getting session status (${sessionId}):`, error);
      throw error;
    }
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    updates: { name?: string; tags?: string[] },
  ): Promise<SessionInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.UPDATE_SESSION}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...updates }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.statusText}`);
      }

      const { session } = await response.json();
      return session;
    } catch (error) {
      console.error(`Error updating session (${sessionId}):`, error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.DELETE_SESSION}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }

      const { success } = await response.json();
      return success;
    } catch (error) {
      console.error(`Error deleting session (${sessionId}):`, error);
      throw error;
    }
  }

  /**
   * Restore a session
   */
  async restoreSession(sessionId: string): Promise<SessionInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.RESTORE_SESSION}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to restore session: ${response.statusText}`);
      }

      const { success, session } = await response.json();
      if (!success) {
        throw new Error('Failed to restore session');
      }

      return session;
    } catch (error) {
      console.error(`Error restoring session (${sessionId}):`, error);
      throw error;
    }
  }

  /**
   * Send a streaming query
   */
  async sendStreamingQuery(
    sessionId: string,
    query: string | ChatCompletionContentPart[],
    onEvent: (event: Event) => void,
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.QUERY_STREAM}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send query: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              onEvent(eventData);
            } catch (e) {
              console.error('Error parsing event data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming query:', error);
      throw error;
    }
  }

  /**
   * Send a non-streaming query
   */
  async sendQuery(sessionId: string, query: string | ChatCompletionContentPart[]): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.QUERY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send query: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error sending query:', error);
      throw error;
    }
  }

  /**
   * Abort a running query
   */
  async abortQuery(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ABORT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to abort query: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error aborting query:', error);
      throw error;
    }
  }

  /**
   * Generate a summary for a conversation
   */
  async generateSummary(sessionId: string, messages: any[]): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.GENERATE_SUMMARY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messages }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.statusText}`);
      }

      const { summary } = await response.json();
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Untitled Conversation';
    }
  }

  /**
   * Get browser control information for a session
   */
  async getBrowserControlInfo(sessionId: string): Promise<{ mode: string; tools: string[] }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/sessions/browser-control?sessionId=${sessionId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get browser control info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error getting browser control info (${sessionId}):`, error);
      // 返回默认值作为回退
      return { mode: 'default', tools: [] };
    }
  }

  /**
   * Get model information from the server
   * @returns Model provider and model name information
   */
  async getModelInfo(): Promise<{ provider: string; model: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MODEL_INFO}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting model info:', error);
      // Return default values in case of error
      return { provider: 'Unknown Provider', model: 'Unknown Model' };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();