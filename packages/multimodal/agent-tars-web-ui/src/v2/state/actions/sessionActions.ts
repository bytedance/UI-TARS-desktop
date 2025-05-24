import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../../services/apiService';
import { sessionsAtom, activeSessionIdAtom } from '../atoms/session';
import { messagesAtom } from '../atoms/message';
import { toolResultsAtom, toolCallResultMap } from '../atoms/tool';
import { isProcessingAtom } from '../atoms/ui';
import { processEventAction } from './eventProcessor';
import { Message, EventType } from '../../types';
import { connectionStatusAtom } from '../atoms/ui'; // 假设 connectionStatusAtom 已经存在

/**
 * Load all available sessions
 */
export const loadSessionsAction = atom(null, async (get, set) => {
  try {
    const loadedSessions = await apiService.getSessions();
    set(sessionsAtom, loadedSessions);
  } catch (error) {
    console.error('Failed to load sessions:', error);
    throw error;
  }
});

/**
 * Create a new session
 */
export const createSessionAction = atom(null, async (get, set) => {
  try {
    const newSession = await apiService.createSession();

    // Add to sessions list
    set(sessionsAtom, (prev) => [newSession, ...prev]);

    // Initialize session data
    set(messagesAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    set(toolResultsAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    // Set as active session
    set(activeSessionIdAtom, newSession.id);

    return newSession.id;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
});

/**
 * Set the active session
 */
export const setActiveSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    // Check if session is active, restore if not
    const sessionDetails = await apiService.getSessionDetails(sessionId);

    if (!sessionDetails.active) {
      await apiService.restoreSession(sessionId);
    }

    // Clear tool call mapping cache
    toolCallResultMap.clear();

    // Load session events if not already loaded
    const messages = get(messagesAtom);
    if (!messages[sessionId]) {
      const events = await apiService.getSessionEvents(sessionId);

      // Process each event to build messages and tool results
      for (const event of events) {
        set(processEventAction, { sessionId, event });
      }
    }

    // Set as active session
    set(activeSessionIdAtom, sessionId);
  } catch (error) {
    console.error('Failed to set active session:', error);
    // 确保连接状态反映了这次失败
    set(connectionStatusAtom, (prev) => ({
      ...prev,
      connected: false,
      lastError: error instanceof Error ? error.message : String(error),
    }));
    throw error;
  }
});

/**
 * Update session metadata
 */
export const updateSessionAction = atom(
  null,
  async (get, set, params: { sessionId: string; updates: { name?: string; tags?: string[] } }) => {
    const { sessionId, updates } = params;

    try {
      const updatedSession = await apiService.updateSessionMetadata(sessionId, updates);

      // Update session in the list
      set(sessionsAtom, (prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, ...updatedSession } : session,
        ),
      );

      return updatedSession;
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  },
);

/**
 * Delete a session
 */
export const deleteSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    const success = await apiService.deleteSession(sessionId);
    const activeSessionId = get(activeSessionIdAtom);

    if (success) {
      // Remove from sessions list
      set(sessionsAtom, (prev) => prev.filter((session) => session.id !== sessionId));

      // Clear active session if it was deleted
      if (activeSessionId === sessionId) {
        set(activeSessionIdAtom, null);
      }

      // Clear session data
      set(messagesAtom, (prev) => {
        const newMessages = { ...prev };
        delete newMessages[sessionId];
        return newMessages;
      });

      set(toolResultsAtom, (prev) => {
        const newResults = { ...prev };
        delete newResults[sessionId];
        return newResults;
      });
    }

    return success;
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
});

/**
 * Send a message in the current session
 */
export const sendMessageAction = atom(null, async (get, set, content: string) => {
  const activeSessionId = get(activeSessionIdAtom);

  if (!activeSessionId) {
    throw new Error('No active session');
  }

  // Set processing state
  set(isProcessingAtom, true);

  // Add user message to state
  const userMessage: Message = {
    id: uuidv4(),
    role: 'user',
    content,
    timestamp: Date.now(),
  };

  set(messagesAtom, (prev) => {
    const sessionMessages = prev[activeSessionId] || [];
    return {
      ...prev,
      [activeSessionId]: [...sessionMessages, userMessage],
    };
  });

  try {
    // Send streaming query
    await apiService.sendStreamingQuery(activeSessionId, content, (event) => {
      // Process each event
      set(processEventAction, { sessionId: activeSessionId, event });

      // Generate summary when conversation ends
      if (event.type === EventType.ASSISTANT_MESSAGE && event.finishReason === 'stop') {
        handleConversationEnd(get, set, activeSessionId);
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    set(isProcessingAtom, false);
    throw error;
  }
});

/**
 * Abort the current running query
 */
export const abortQueryAction = atom(null, async (get, set) => {
  const activeSessionId = get(activeSessionIdAtom);

  if (!activeSessionId) {
    return false;
  }

  try {
    const success = await apiService.abortQuery(activeSessionId);

    if (success) {
      set(isProcessingAtom, false);

      // Add system message about abort
      const abortMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: 'The operation was aborted.',
        timestamp: Date.now(),
      };

      set(messagesAtom, (prev) => {
        const sessionMessages = prev[activeSessionId] || [];
        return {
          ...prev,
          [activeSessionId]: [...sessionMessages, abortMessage],
        };
      });
    }

    return success;
  } catch (error) {
    console.error('Error aborting query:', error);
    return false;
  }
});

/**
 * Handle the end of a conversation
 * Generates a summary and updates the session name
 */
async function handleConversationEnd(get: any, set: any, sessionId: string): Promise<void> {
  const allMessages = get(messagesAtom)[sessionId] || [];

  // Only proceed if we have actual conversation messages
  if (allMessages.length > 1) {
    try {
      // Convert messages to format expected by LLM API
      const apiMessages = allMessages.map((msg: Message) => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : 'multimodal content',
      }));

      // Generate summary
      const summary = await apiService.generateSummary(sessionId, apiMessages);

      if (summary) {
        // Update session name
        await apiService.updateSessionMetadata(sessionId, { name: summary });

        // Update sessions atom
        set(sessionsAtom, (prev: any[]) =>
          prev.map((session) =>
            session.id === sessionId ? { ...session, name: summary } : session,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to generate or update summary:', error);
    }
  }
}