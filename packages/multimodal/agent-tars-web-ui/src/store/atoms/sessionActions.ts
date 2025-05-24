import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { ApiService } from '../../services/api';
import { SessionInfo, Message, ToolResult, Event } from '../../types';
import {
  sessionsAtom,
  activeSessionIdAtom,
  messagesAtom,
  toolResultsAtom,
  isProcessingAtom,
} from './sessionAtoms';
import { handleEventAction, handleEventWithSummary, clearToolResultMap } from './eventHandlers';

// Load all sessions
export const loadSessionsAction = atom(null, async (get, set) => {
  try {
    const loadedSessions = await ApiService.getSessions();
    set(sessionsAtom, loadedSessions);
  } catch (error) {
    console.error('Failed to load sessions:', error);
  }
});

// Create new session
export const createNewSessionAction = atom(null, async (get, set) => {
  try {
    const newSession = await ApiService.createSession();
    set(sessionsAtom, (prev) => [newSession, ...prev]);

    // Initialize session messages and tool results
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

// Set active session
export const setActiveSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    // Check if session is active, if not restore it
    const sessionDetails = await ApiService.getSessionDetails(sessionId);

    if (!sessionDetails.active) {
      await ApiService.restoreSession(sessionId);
    }

    // Clear the tool call-result mapping when changing sessions
    clearToolResultMap();

    // Load session events if not already loaded
    const messages = get(messagesAtom);
    if (!messages[sessionId]) {
      const events = await ApiService.getSessionEvents(sessionId);

      // Process events to build messages and tool results
      for (const event of events) {
        // Call the atom's write function directly through set
        set(handleEventAction, sessionId, event);
      }
    }

    set(activeSessionIdAtom, sessionId);
  } catch (error) {
    console.error('Failed to set active session:', error);
    throw error;
  }
});

// Update session metadata
export const updateSessionMetadataAction = atom(
  null,
  async (get, set, params: { sessionId: string; updates: { name?: string; tags?: string[] } }) => {
    const { sessionId, updates } = params;
    try {
      const updatedSession = await ApiService.updateSession(sessionId, updates);

      set(sessionsAtom, (prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, ...updatedSession } : session,
        ),
      );
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  },
);

// Delete session
export const deleteSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    const success = await ApiService.deleteSession(sessionId);
    const activeSessionId = get(activeSessionIdAtom);

    if (success) {
      set(sessionsAtom, (prev) => prev.filter((session) => session.id !== sessionId));

      if (activeSessionId === sessionId) {
        set(activeSessionIdAtom, null);
      }

      // Clear session related messages and tool results
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

// Send message
export const sendMessageAction = atom(null, async (get, set, content: string) => {
  const activeSessionId = get(activeSessionIdAtom);

  if (!activeSessionId) {
    throw new Error('No active session');
  }

  set(isProcessingAtom, true);

  // Immediately add user message to state
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
    // Use streaming query
    await ApiService.sendStreamingQuery(activeSessionId, content, (event) => {
      // Use the event handler with summary generation on conversation end
      set(handleEventWithSummary, activeSessionId, event);
    });
  } catch (error) {
    console.error('Error sending message:', error);
    set(isProcessingAtom, false);
  }
});

// Abort current query
export const abortCurrentQueryAction = atom(null, async (get, set) => {
  const activeSessionId = get(activeSessionIdAtom);

  if (!activeSessionId) {
    return false;
  }

  try {
    const success = await ApiService.abortQuery(activeSessionId);

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

// Reset all sessions
export const resetSessionsAction = atom(null, (get, set) => {
  set(sessionsAtom, []);
  set(activeSessionIdAtom, null);
  set(messagesAtom, {});
  set(toolResultsAtom, {});
  ApiService.disconnect();
});
