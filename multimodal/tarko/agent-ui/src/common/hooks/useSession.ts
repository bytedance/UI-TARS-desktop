import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { sessionsAtom, activeSessionIdAtom } from '../state/atoms/session';
import { messagesAtom, groupedMessagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { plansAtom, planUIStateAtom } from '../state/atoms/plan';
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

/**
 * Hook for session management functionality
 */
export function useSession() {
  // State
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
  const [plans, setPlans] = useAtom(plansAtom);
  const setPlanUIState = useSetAtom(planUIStateAtom);
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  // Derive sessionMetadata from sessions instead of separate atom
  const sessionMetadata = useMemo(() => {
    if (!activeSessionId || !sessions.length) return {};
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    return currentSession?.metadata || {};
  }, [activeSessionId, sessions]);

  // Check if we're in replay mode using the context hook
  const { isReplayMode } = useReplayMode();

  // Actions
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

  // Debounced status checking for active session - do not check status in replay mode
  const statusCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!activeSessionId || !connectionStatus.connected || isReplayMode) return;

    // Clear any pending timeout
    if (statusCheckTimeoutRef.current) {
      clearTimeout(statusCheckTimeoutRef.current);
    }

    // Debounce status check to avoid rapid calls
    statusCheckTimeoutRef.current = setTimeout(() => {
      if (activeSessionId && connectionStatus.connected && !isReplayMode) {
        checkSessionStatus(activeSessionId);
      }
    }, 200); // 200ms debounce to allow for quick session switches

    return () => {
      if (statusCheckTimeoutRef.current) {
        clearTimeout(statusCheckTimeoutRef.current);
      }
    };
  }, [activeSessionId, connectionStatus.connected, checkSessionStatus, isReplayMode]);

  // Enhanced socket handler for session status sync - do not update state in replay mode
  const handleSessionStatusUpdate = useCallback(
    (status: any) => {
      if (status && typeof status.isProcessing === 'boolean' && !isReplayMode && activeSessionId) {
        // Update session-specific agent status
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

  // Set up socket event handlers when active session changes - do not set up socket event handling in replay mode
  useEffect(() => {
    if (!activeSessionId || !socketService.isConnected() || isReplayMode) return;

    // Join session and listen for status updates
    socketService.joinSession(
      activeSessionId,
      () => {
        /* existing event handling */
      },
      handleSessionStatusUpdate,
    );

    // Register global status handler
    socketService.on('agent-status', handleSessionStatusUpdate);

    return () => {
      // Clean up handlers
      socketService.off('agent-status', handleSessionStatusUpdate);
    };
  }, [activeSessionId, handleSessionStatusUpdate, isReplayMode]);

  // Auto-show plan when it's first created - do not automatically show plan in replay mode
  useEffect(() => {
    if (activeSessionId && plans[activeSessionId]?.hasGeneratedPlan && !isReplayMode) {
      const currentPlan = plans[activeSessionId];

      // If this is a newly generated plan, automatically show it
      if (currentPlan.steps.length > 0 && currentPlan.steps.every((step) => !step.done)) {
        setPlanUIState((prev) => ({
          ...prev,
          isVisible: true,
        }));
      }
    }
  }, [activeSessionId, plans, setPlanUIState, isReplayMode]);

  // Memoize the session state object to avoid unnecessary re-renders
  const sessionState = useMemo(
    () => ({
      // State
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
      plans,
      replayState,
      sessionMetadata,

      // Session operations
      loadSessions,
      createSession,
      setActiveSession,
      updateSessionInfo,
      updateSessionMetadata,
      deleteSession,

      // Message operations
      sendMessage,
      abortQuery,

      // UI operations
      setActivePanelContent,

      // Connection operations
      initConnectionMonitoring,
      checkServerStatus,

      // Status operations
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
      plans,
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
