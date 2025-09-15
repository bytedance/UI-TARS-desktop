import { atom, Getter, Setter } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../../services/apiService';
import { sessionsAtom, activeSessionIdAtom } from '../atoms/session';
import { messagesAtom } from '../atoms/message';
import { toolResultsAtom, toolCallResultMap } from '../atoms/tool';
import { sessionPanelContentAtom, isProcessingAtom } from '../atoms/ui';
import { processEventAction } from './eventProcessors';
import { Message, SessionInfo } from '@/common/types';
import { connectionStatusAtom } from '../atoms/ui';
import { replayStateAtom } from '../atoms/replay';
import { sessionFilesAtom, FileItem } from '../atoms/files';
import { ChatCompletionContentPart, AgentEventStream } from '@tarko/agent-interface';
import { SessionItemMetadata } from '@tarko/interface';

// Priority-based file selection for workspace display: HTML > Markdown > Others
function selectBestFileToDisplay(files: FileItem[]): FileItem | null {
  if (!files || files.length === 0) {
    return null;
  }

  const actualFiles = files.filter((file) => file.type === 'file');

  if (actualFiles.length === 0) {
    return null;
  }

  const sortedFiles = actualFiles.sort((a, b) => {
    const getFilePriority = (file: FileItem): number => {
      const extension = file.path.toLowerCase().split('.').pop() || '';

      if (extension === 'html' || extension === 'htm') {
        return 1;
      }

      if (extension === 'md' || extension === 'markdown') {
        return 2;
      }

      return 3;
    };

    const aPriority = getFilePriority(a);
    const bPriority = getFilePriority(b);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Same priority: sort by timestamp (newest first)
    return b.timestamp - a.timestamp;
  });

  return sortedFiles[0];
}

function setWorkspacePanelForFile(set: Setter, sessionId: string, file: FileItem): void {
  set(sessionPanelContentAtom, (prev) => ({
    ...prev,
    [sessionId]: {
      type: 'file',
      source: file.content || '',
      title: file.name,
      timestamp: file.timestamp,
      toolCallId: file.toolCallId,
      arguments: {
        path: file.path,
        content: file.content,
      },
    },
  }));
}

export const loadSessionsAction = atom(null, async (get, set) => {
  try {
    const loadedSessions = await apiService.getSessions();
    set(sessionsAtom, loadedSessions);
  } catch (error) {
    console.error('Failed to load sessions:', error);
    throw error;
  }
});

export const createSessionAction = atom(null, async (get, set, runtimeSettings?: Record<string, any>, agentOptions?: Record<string, any>) => {
  try {
    const { session: newSession, events: initializationEvents } = await apiService.createSession(runtimeSettings, agentOptions);

    set(sessionsAtom, (prev) => [newSession, ...prev]);

    set(messagesAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    // Session metadata is now stored in sessions array, no separate atom needed
    console.log(`Created session ${newSession.id} with metadata:`, newSession.metadata);

    set(toolResultsAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    // Clear panel content for new session
    set(sessionPanelContentAtom, (prev) => ({
      ...prev,
      [newSession.id]: null,
    }));
    set(activeSessionIdAtom, newSession.id);

    // Process initialization events if any were returned
    if (initializationEvents && initializationEvents.length > 0) {
      console.log(`Processing ${initializationEvents.length} initialization events for session ${newSession.id}`);
      
      const processedEvents = preprocessStreamingEvents(initializationEvents);
      
      for (const event of processedEvents) {
        await set(processEventAction, { sessionId: newSession.id, event });
      }
    }

    return newSession.id;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
});

// Simplified session activation without caching complexity
export const setActiveSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    const currentActiveSessionId = get(activeSessionIdAtom);
    if (currentActiveSessionId === sessionId) {
      console.log(`Session ${sessionId} is already active, skipping load`);
      return;
    }

    // Exit replay mode when switching sessions
    const replayState = get(replayStateAtom);
    if (replayState.isActive) {
      console.log('Exiting replay mode due to session change');
      set(replayStateAtom, {
        isActive: false,
        events: [],
        currentEventIndex: -1,
        isPlaying: false,
        playbackSpeed: 1,
        startTimestamp: null,
        endTimestamp: null,
        autoPlayCountdown: null,
      });
    }

    // Processing state will be managed by SSE events

    toolCallResultMap.clear();

    // Load session data - since server always provides modelConfig, we can simplify this
    const messages = get(messagesAtom);
    const hasExistingMessages = messages[sessionId] && messages[sessionId].length > 0;

    if (!hasExistingMessages) {
      console.log(`Loading events for session ${sessionId}`);
      const events = await apiService.getSessionEvents(sessionId);
      console.log(`Loading events for session ${sessionId} successed..`);

      const processedEvents = preprocessStreamingEvents(events);

      for (const event of processedEvents) {
        await set(processEventAction, { sessionId, event });
      }
    }

    // Always ensure we have the latest session metadata (including modelConfig)
    // This is lightweight since server always provides it
    try {
      const sessionDetails = await apiService.getSessionDetails(sessionId);
      if (sessionDetails.metadata) {
        set(updateSessionMetadataAction, {
          sessionId,
          metadata: sessionDetails.metadata,
        });
      }
    } catch (error) {
      console.warn(`Failed to load session metadata:`, error);
      // Keep current state on error
    }

    set(activeSessionIdAtom, sessionId);

    // Auto-select best file for workspace display only if no panel content was set by events
    const currentPanelContent = get(sessionPanelContentAtom);
    const sessionPanelContent = currentPanelContent[sessionId];
    
    if (!sessionPanelContent) {
      // No panel content was set by events, try to auto-select a file
      const sessionFiles = get(sessionFilesAtom);
      const files = sessionFiles[sessionId] || [];
      const bestFile = selectBestFileToDisplay(files);

      if (bestFile) {
        setWorkspacePanelForFile(set, sessionId, bestFile);
      }
      // If no files and no panel content, leave it as null (don't explicitly clear)
    }
  } catch (error) {
    console.error('Failed to set active session:', error);
    set(connectionStatusAtom, (prev) => ({
      ...prev,
      connected: false,
      lastError: error instanceof Error ? error.message : String(error),
    }));
    throw error;
  }
});

export const updateSessionAction = atom(
  null,
  async (get, set, params: { sessionId: string; updates: Partial<SessionInfo> }) => {
    const { sessionId, updates } = params;

    try {
      const updatedSession = await apiService.updateSessionInfo(sessionId, updates);

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

// Ensure streaming events are processed in correct order
function preprocessStreamingEvents(events: AgentEventStream.Event[]): AgentEventStream.Event[] {
  const messageStreams: Record<string, AgentEventStream.Event[]> = {};

  // No special preprocessing needed for current event types

  return events;
}

// Utility action to update session metadata without duplication
export const updateSessionMetadataAction = atom(
  null,
  (get, set, params: { sessionId: string; metadata: Partial<SessionItemMetadata> }) => {
    const { sessionId, metadata } = params;

    set(sessionsAtom, (prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              metadata: {
                ...session.metadata,
                ...metadata,
              },
            }
          : session,
      ),
    );

    console.log(`Updated metadata for session ${sessionId}:`, metadata);
  },
);

export const deleteSessionAction = atom(null, async (get, set, sessionId: string) => {
  try {
    const success = await apiService.deleteSession(sessionId);
    const activeSessionId = get(activeSessionIdAtom);

    if (success) {
      set(sessionsAtom, (prev) => prev.filter((session) => session.id !== sessionId));

      if (activeSessionId === sessionId) {
        set(activeSessionIdAtom, null);
      }

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

      // Clean up session-specific UI state
      set(sessionPanelContentAtom, (prev) => {
        const newPanelContent = { ...prev };
        delete newPanelContent[sessionId];
        return newPanelContent;
      });
    }

    return success;
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
});

export const sendMessageAction = atom(
  null,
  async (get, set, content: string | ChatCompletionContentPart[]) => {
    const activeSessionId = get(activeSessionIdAtom);

    if (!activeSessionId) {
      throw new Error('No active session');
    }

    // Update processing state
    set(isProcessingAtom, true);

    // Immediately add user message to UI for better UX
    // Server-side user_message events will be deduplicated in the handler
    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      isLocalMessage: true, // Mark as locally added for deduplication
    };

    set(messagesAtom, (prev) => ({
      ...prev,
      [activeSessionId]: [...(prev[activeSessionId] || []), userMessage],
    }));

    // Set initial session name from first user query
    // Check if this is the first user message (excluding the one we just added)
    try {
      const messages = get(messagesAtom)[activeSessionId] || [];
      const userMessageCount = messages.filter((m) => m.role === 'user').length;

      if (userMessageCount === 1) {
        // Now we check for 1 since we just added the message
        let summary = '';
        if (typeof content === 'string') {
          summary = content.length > 50 ? content.substring(0, 47) + '...' : content;
        } else {
          const textPart = content.find((part) => part.type === 'text');
          if (textPart && 'text' in textPart) {
            summary =
              textPart.text.length > 50 ? textPart.text.substring(0, 47) + '...' : textPart.text;
          } else {
            summary = 'Image message';
          }
        }

        await apiService.updateSessionInfo(activeSessionId, { metadata: { name: summary } });

        set(sessionsAtom, (prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  metadata: {
                    ...session.metadata,
                    name: summary,
                  },
                }
              : session,
          ),
        );
      }
    } catch (error) {
      console.log('Failed to update initial summary, continuing anyway:', error);
    }

    try {
      await apiService.sendStreamingQuery(activeSessionId, content, (event) => {
        set(processEventAction, { sessionId: activeSessionId, event });
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Set processing to false on error
      set(isProcessingAtom, false);
      throw error;
    }
  },
);

export const abortQueryAction = atom(null, async (get, set) => {
  const activeSessionId = get(activeSessionIdAtom);

  if (!activeSessionId) {
    return false;
  }

  try {
    const success = await apiService.abortQuery(activeSessionId);

    // Immediately set processing to false on successful abort to prevent flickering
    if (success) {
      set(isProcessingAtom, false);
    }

    return success;
  } catch (error) {
    console.error('Error aborting query:', error);
    // Also set processing to false on error to ensure UI consistency
    set(isProcessingAtom, false);
    return false;
  }
});

// Cache to prevent frequent status checks for the same session
const statusCheckCache = new Map<string, { timestamp: number; promise?: Promise<any> }>();
const STATUS_CACHE_TTL = 2000; // 2 seconds cache

export const checkSessionStatusAction = atom(null, async (get, set, sessionId: string) => {
  if (!sessionId) return;

  const now = Date.now();
  const cached = statusCheckCache.get(sessionId);

  // If we have a recent check or an ongoing request, skip
  if (cached) {
    if (cached.promise) {
      // There's already an ongoing request for this session
      return cached.promise;
    }
    if (now - cached.timestamp < STATUS_CACHE_TTL) {
      // Recent check, skip
      return;
    }
  }

  try {
    // Mark that we're making a request
    const promise = apiService.getSessionStatus(sessionId);
    statusCheckCache.set(sessionId, { timestamp: now, promise });

    const status = await promise;

    // Update simple processing state
    set(isProcessingAtom, status.isProcessing);

    // Clear the promise and update timestamp
    statusCheckCache.set(sessionId, { timestamp: now });

    return status;
  } catch (error) {
    console.error('Failed to check session status:', error);
    // Clear the failed request
    statusCheckCache.delete(sessionId);
  }
});
