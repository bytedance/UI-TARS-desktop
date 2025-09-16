import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { sessionsAtom, activeSessionIdAtom } from '../state/atoms/session';
import { messagesAtom, groupedMessagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';

import { sessionFilesAtom } from '../state/atoms/files';
import {
  isProcessingAtom,
  activePanelContentAtom,
  connectionStatusAtom,
  agentStatusAtom,
  sessionAgentStatusAtom,
} from '../state/atoms/ui';
import { replayStateAtom } from '../state/atoms/replay';
import {
  loadSessionsAction,
  createSessionAction,
  setActiveSessionAction,
  updateSessionAction,
  updateSessionMetadataAction,
  deleteSessionAction,
  sendMessageAction,
  abortQueryAction,
  checkSessionStatusAction,
} from '../state/actions/sessionActions';
import {
  initConnectionMonitoringAction,
  checkConnectionStatusAction,
} from '../state/actions/connectionActions';
import { socketService } from '../services/socketService';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useReplayMode } from '../hooks/useReplayMode';

export function useSession() {
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const messages = useAtomValue(messagesAtom);
  const groupedMessages = useAtomValue(groupedMessagesAtom);
  const toolResults = useAtomValue(toolResultsAtom);
  const sessionFiles = useAtomValue(sessionFilesAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [agentStatus, setAgentStatus] = useAtom(agentStatusAtom);
  const setSessionAgentStatus = useSetAtom(sessionAgentStatusAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);

  const [replayState, setReplayState] = useAtom(replayStateAtom);

  const sessionMetadata = useMemo(() => {
    if (!activeSessionId || !sessions.length) return {};
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    return currentSession?.metadata || {};
  }, [activeSessionId, sessions]);

  const { isReplayMode } = useReplayMode();

  const loadSessions = useSetAtom(loadSessionsAction);
  const createSession = useSetAtom(createSessionAction);
  const setActiveSession = useSetAtom(setActiveSessionAction);
  const updateSessionInfo = useSetAtom(updateSessionAction);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const deleteSession = useSetAtom(deleteSessionAction);
  const sendMessage = useSetAtom(sendMessageAction);
  const abortQuery = useSetAtom(abortQueryAction);
  const initConnectionMonitoring = useSetAtom(initConnectionMonitoringAction);
  const checkServerStatus = useSetAtom(checkConnectionStatusAction);
  const checkSessionStatus = useSetAtom(checkSessionStatusAction);

  const statusCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!activeSessionId || !connectionStatus.connected || isReplayMode) return;

    if (statusCheckTimeoutRef.current) {
      clearTimeout(statusCheckTimeoutRef.current);
    }

    statusCheckTimeoutRef.current = setTimeout(() => {
      if (activeSessionId && connectionStatus.connected && !isReplayMode) {
        checkSessionStatus(activeSessionId);
      }
    }, 200);

    return () => {
      if (statusCheckTimeoutRef.current) {
        clearTimeout(statusCheckTimeoutRef.current);
      }
    };
  }, [activeSessionId, connectionStatus.connected, checkSessionStatus, isReplayMode]);

  const handleSessionStatusUpdate = useCallback(
    (status: any) => {
      if (status && typeof status.isProcessing === 'boolean' && !isReplayMode && activeSessionId) {
        setSessionAgentStatus((prev) => ({
          ...prev,
          [activeSessionId]: {
            isProcessing: status.isProcessing,
            state: status.state,
            phase: status.phase,
            message: status.message,
            estimatedTime: status.estimatedTime,
          },
        }));
      }
    },
    [activeSessionId, isReplayMode, setSessionAgentStatus],
  );

  useEffect(() => {
    if (!activeSessionId || !socketService.isConnected() || isReplayMode) return;

    socketService.joinSession(activeSessionId, () => {}, handleSessionStatusUpdate);

    socketService.on('agent-status', handleSessionStatusUpdate);

    return () => {
      socketService.off('agent-status', handleSessionStatusUpdate);
    };
  }, [activeSessionId, handleSessionStatusUpdate, isReplayMode]);

  const sessionState = useMemo(
    () => ({
      sessions,
      activeSessionId,
      messages,
      groupedMessages,
      toolResults,
      sessionFiles,
      isProcessing,
      agentStatus,
      activePanelContent,
      connectionStatus,

      replayState,
      sessionMetadata,

      loadSessions,
      createSession,
      setActiveSession,
      updateSessionInfo,
      updateSessionMetadata,
      deleteSession,

      sendMessage,
      abortQuery,

      setActivePanelContent,

      initConnectionMonitoring,
      checkServerStatus,

      checkSessionStatus,
    }),
    [
      sessions,
      activeSessionId,
      messages,
      groupedMessages,
      toolResults,
      sessionFiles,
      isProcessing,
      agentStatus,
      activePanelContent,
      connectionStatus,
      replayState,
      sessionMetadata,
      loadSessions,
      createSession,
      setActiveSession,
      updateSessionInfo,
      updateSessionMetadata,
      deleteSession,
      sendMessage,
      abortQuery,
      setActivePanelContent,
      initConnectionMonitoring,
      checkServerStatus,
      checkSessionStatus,
    ],
  );

  return sessionState;
}
