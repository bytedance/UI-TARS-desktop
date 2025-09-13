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
  sessionMetadataAtom,
  agentOptionsAtom,
  agentStatusAtom,
  sessionAgentStatusAtom,
} from '../state/atoms/ui';
import { replayStateAtom } from '../state/atoms/replay';
import {
  loadSessionsAction,
  createSessionAction,
  setActiveSessionAction,
  updateSessionAction,
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

import { useEffect, useCallback, useMemo } from 'react';
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
  const sessionMetadata = useAtomValue(sessionMetadataAtom);
  const agentOptions = useAtomValue(agentOptionsAtom);

  // Check if we're in replay mode using the context hook
  const { isReplayMode } = useReplayMode();

  // Actions
  const loadSessions = useSetAtom(loadSessionsAction);
  const createSession = useSetAtom(createSessionAction);
  const setActiveSession = useSetAtom(setActiveSessionAction);
  const updateSessionInfo = useSetAtom(updateSessionAction);
  const deleteSession = useSetAtom(deleteSessionAction);
  const sendMessage = useSetAtom(sendMessageAction);
  const abortQuery = useSetAtom(abortQueryAction);
  const initConnectionMonitoring = useSetAtom(initConnectionMonitoringAction);
  const checkServerStatus = useSetAtom(checkConnectionStatusAction);
  const checkSessionStatus = useSetAtom(checkSessionStatusAction);



  // Set up socket event handlers when active session changes - do not set up socket event handling in replay mode
  useEffect(() => {
    if (!activeSessionId || !socketService.isConnected() || isReplayMode) return;

    // Create stable status update handler
    const statusUpdateHandler = (status: any) => {
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
    };

    // Join session and listen for status updates
    socketService.joinSession(
      activeSessionId,
      () => {
        /* existing event handling */
      },
      statusUpdateHandler,
    );

    // No need for additional global handler - joinSession already handles status updates
    return () => {
      // Cleanup is handled by joinSession's internal logic
    };
  }, [activeSessionId, isReplayMode]);

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
      agentOptions,

      // Session operations
      loadSessions,
      createSession,
      setActiveSession,
      updateSessionInfo,
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
      agentOptions,
      loadSessions,
      createSession,
      setActiveSession,
      updateSessionInfo,
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
