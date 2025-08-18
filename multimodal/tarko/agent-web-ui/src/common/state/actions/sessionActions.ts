import { atom, Getter, Setter } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../../services/apiService';
import { sessionsAtom, activeSessionIdAtom } from '../atoms/session';
import { messagesAtom } from '../atoms/message';
import { toolResultsAtom, toolCallResultMap } from '../atoms/tool';
import {
  isProcessingAtom,
  activePanelContentAtom,
  modelInfoAtom,
  agentInfoAtom,
} from '../atoms/ui';
import { processEventAction } from './eventProcessors';
import { Message, SessionItemInfo } from '@/common/types';
import { connectionStatusAtom } from '../atoms/ui';
import { replayStateAtom } from '../atoms/replay';
import { sessionFilesAtom, FileItem } from '../atoms/files';
import { ChatCompletionContentPart, AgentEventStream } from '@tarko/agent-interface';

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

function setWorkspacePanelForFile(set: Setter, file: FileItem): void {
  set(activePanelContentAtom, {
    type: 'file',
    source: file.content || '',
    title: file.name,
    timestamp: file.timestamp,
    toolCallId: file.toolCallId,
    arguments: {
      path: file.path,
      content: file.content,
    },
  });
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

export const createSessionAction = atom(null, async (get, set) => {
  try {
    const newSession = await apiService.createSession();

    set(sessionsAtom, (prev) => [newSession, ...prev]);

    set(messagesAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    // Update agent info when creating session
    set(agentInfoAtom, (prev) => ({
      ...prev,
      name: newSession.metadata?.agentInfo?.name,
    }));

    set(toolResultsAtom, (prev) => ({
      ...prev,
      [newSession.id]: [],
    }));

    set(activePanelContentAtom, null);
    set(activeSessionIdAtom, newSession.id);

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

    // Update processing status based on current session state
    try {
      const status = await apiService.getSessionStatus(sessionId);
      set(isProcessingAtom, status.isProcessing);
    } catch (error) {
      console.warn('Failed to get session status:', error);
      set(isProcessingAtom, false);
    }

    toolCallResultMap.clear();

    // Load events only if messages aren't already loaded
    const messages = get(messagesAtom);
    const hasExistingMessages = messages[sessionId] && messages[sessionId].length > 0;

    if (!hasExistingMessages) {
      console.log(`Loading events for session ${sessionId}`);
      const events = await apiService.getSessionEvents(sessionId);

      const processedEvents = preprocessStreamingEvents(events);

      for (const event of processedEvents) {
        await set(processEventAction, { sessionId, event });
      }
    } else {
      console.log(`Session ${sessionId} already has messages, skipping event loading`);

      // Load session metadata and events to restore model/agent info
      try {
        console.log(`Loading session metadata for ${sessionId}`);
        const sessionDetails = await apiService.getSessionDetails(sessionId);

        // Restore agent info from session metadata
        if (sessionDetails.metadata?.agentInfo?.name) {
          const agentInfo = { name: sessionDetails.metadata.agentInfo.name };
          set(agentInfoAtom, agentInfo);
          console.log(`Restored agent info from session metadata for ${sessionId}:`, agentInfo);
        }

        // Load events to get model info from agent_run_start event
        const events = await apiService.getSessionEvents(sessionId);
        const runStartEvent = events.find((e) => e.type === 'agent_run_start');

        if (runStartEvent && ('provider' in runStartEvent || 'model' in runStartEvent)) {
          const modelInfo = {
            provider: runStartEvent.provider || '',
            model: runStartEvent.model || '',
            displayName: runStartEvent.modelDisplayName ?? '',
          };
          set(modelInfoAtom, modelInfo);
          console.log(`Restored model info for session ${sessionId}:`, modelInfo);
        }

        // Also extract agent info from events if not in metadata
        if (
          !sessionDetails.metadata?.agentInfo?.name &&
          runStartEvent &&
          'agentName' in runStartEvent &&
          runStartEvent.agentName
        ) {
          const agentInfo = { name: runStartEvent.agentName };
          set(agentInfoAtom, agentInfo);
          console.log(`Restored agent info from events for session ${sessionId}:`, agentInfo);
        }
      } catch (error) {
        console.warn(`Failed to load session metadata/events for info recovery:`, error);
      }
    }

    set(activeSessionIdAtom, sessionId);

    // Auto-select best file for workspace display
    const sessionFiles = get(sessionFilesAtom);
    const files = sessionFiles[sessionId] || [];
    const bestFile = selectBestFileToDisplay(files);

    if (bestFile) {
      console.log(`Auto-selecting file for workspace: ${bestFile.name} (${bestFile.path})`);
      setWorkspacePanelForFile(set, bestFile);
    } else {
      set(activePanelContentAtom, null);
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
  async (get, set, params: { sessionId: string; updates: Partial<SessionItemInfo> }) => {
    const { sessionId, updates } = params;

    try {
      const updatedSession = await apiService.updateSessionItemInfo(sessionId, updates);

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

  events.forEach((event) => {
    if (event.type === 'final_answer_streaming' && 'messageId' in event) {
      const messageId = event.messageId as string;
      if (!messageStreams[messageId]) {
        messageStreams[messageId] = [];
      }
      messageStreams[messageId].push(event);
    }
  });

  return events;
}

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

    set(isProcessingAtom, true);

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

    // Set initial session name from first user query
    try {
      const messages = get(messagesAtom)[activeSessionId] || [];
      if (messages.length <= 2) {
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

        await apiService.updateSessionItemInfo(activeSessionId, { metadata: { name: summary } });

        set(sessionsAtom, (prev) =>
          prev.map((session) =>
            session.id === activeSessionId ? { ...session, name: summary } : session,
          ),
        );
      }
    } catch (error) {
      console.log('Failed to update initial summary, continuing anyway:', error);
    }

    try {
      await apiService.sendStreamingQuery(activeSessionId, content, (event) => {
        set(processEventAction, { sessionId: activeSessionId, event });

        // Maintain processing state until explicit end
        if (event.type !== 'agent_run_end' && event.type !== 'assistant_message') {
          set(isProcessingAtom, true);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
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
    return success;
  } catch (error) {
    console.error('Error aborting query:', error);
    return false;
  }
});

export const checkSessionStatusAction = atom(null, async (get, set, sessionId: string) => {
  if (!sessionId) return;

  try {
    const status = await apiService.getSessionStatus(sessionId);
    set(isProcessingAtom, status.isProcessing);

    return status;
  } catch (error) {
    console.error('Failed to check session status:', error);
  }
});
