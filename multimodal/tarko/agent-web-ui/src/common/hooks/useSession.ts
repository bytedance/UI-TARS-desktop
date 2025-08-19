import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { sessionsAtom, activeSessionIdAtom, sessionInitializationAtom } from '../state/atoms/session';
import { messagesAtom, groupedMessagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { plansAtom, planUIStateAtom } from '../state/atoms/plan';
import { sessionFilesAtom } from '../state/atoms/files';
import {
  isProcessingAtom,
  activePanelContentAtom,
  connectionStatusAtom,
  modelInfoAtom,
  agentInfoAtom,
  workspaceInfoAtom,
  agentOptionsAtom,
  agentStatusAtom,
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
import { SOCKET_EVENTS } from '../constants';

import { useEffect, useCallback, useMemo } from 'react';
import { useReplayMode } from '../hooks/useReplayMode';

/**
 * Hook for session management functionality
 */
export function useSession() {
  // State
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [sessionInitialization, setSessionInitialization] = useAtom(sessionInitializationAtom);
  const messages = useAtomValue(messagesAtom);
  const groupedMessages = useAtomValue(groupedMessagesAtom);
  const toolResults = useAtomValue(toolResultsAtom);
  const sessionFiles = useAtomValue(sessionFilesAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [agentStatus, setAgentStatus] = useAtom(agentStatusAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [plans, setPlans] = useAtom(plansAtom);
  const setPlanUIState = useSetAtom(planUIStateAtom);
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  const modelInfo = useAtomValue(modelInfoAtom);
  const agentInfo = useAtomValue(agentInfoAtom);
  const workspaceInfo = useAtomValue(workspaceInfoAtom);
  const agentOptions = useAtomValue(agentOptionsAtom);

  // Check if we're in replay mode using the context hook
  const { isReplayMode } = useReplayMode();

  // Actions
  const loadSessions = useSetAtom(loadSessionsAction);
  const createSession = useSetAtom(createSessionAction);
  const setActiveSession = useSetAtom(setActiveSessionAction);
  const updateSessionMetadata = useSetAtom(updateSessionAction);
  const deleteSession = useSetAtom(deleteSessionAction);
  const sendMessage = useSetAtom(sendMessageAction);
  const abortQuery = useSetAtom(abortQueryAction);
  const initConnectionMonitoring = useSetAtom(initConnectionMonitoringAction);
  const checkServerStatus = useSetAtom(checkConnectionStatusAction);
  const checkSessionStatus = useSetAtom(checkSessionStatusAction);

  // Periodic status checking for active session - do not check status in replay mode
  useEffect(() => {
    if (!activeSessionId || !connectionStatus.connected || isReplayMode) return;

    // Initial status check when session becomes active
    checkSessionStatus(activeSessionId);
  }, [activeSessionId, connectionStatus.connected, checkSessionStatus, isReplayMode]);

  // Enhanced socket handler for session status sync - do not update state in replay mode
  const handleSessionStatusUpdate = useCallback(
    (status: any) => {
      if (status && typeof status.isProcessing === 'boolean' && !isReplayMode) {
        setIsProcessing(status.isProcessing);
        
        // Update enhanced agent status for TTFT optimization
        setAgentStatus({
          isProcessing: status.isProcessing,
          state: status.state,
          phase: status.phase,
          message: status.message,
          estimatedTime: status.estimatedTime,
        });
      }
    },
    [setIsProcessing, setAgentStatus, isReplayMode],
  );

  // Handle session initialization events
  const handleSessionInitialization = useCallback(
    (event: any) => {
      console.log('🔄 [SessionInit] Received initialization event:', event);
      
      if (!event.sessionId) {
        console.warn('⚠️ [SessionInit] Event missing sessionId:', event);
        return;
      }

      setSessionInitialization((prev) => {
        const current = prev[event.sessionId] || {
          isInitializing: true,
          message: '',
          events: [],
        };

        const newEvent = {
          type: event.type,
          message: event.message,
          timestamp: event.timestamp || Date.now(),
          error: event.error,
        };

        const updatedStatus = {
          ...current,
          message: event.message,
          events: [...current.events, newEvent],
          isInitializing: event.type !== 'completed' && event.type !== 'error',
        };

        console.log('✅ [SessionInit] Updated status for session', event.sessionId, ':', updatedStatus);

        return {
          ...prev,
          [event.sessionId]: updatedStatus,
        };
      });
    },
    [setSessionInitialization],
  );

  // Set up socket event handlers when active session changes - do not set up socket event handling in replay mode
  useEffect(() => {
    if (!socketService.isConnected() || isReplayMode) {
      console.log('🔌 [SessionInit] Socket not connected or in replay mode, skipping event setup');
      return;
    }

    console.log('🔌 [SessionInit] Setting up socket event handlers');
    
    // Register global initialization handler
    socketService.on(SOCKET_EVENTS.SESSION_INITIALIZATION, handleSessionInitialization);

    if (activeSessionId) {
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
    }

    return () => {
      // Clean up handlers
      socketService.off('agent-status', handleSessionStatusUpdate);
      socketService.off(SOCKET_EVENTS.SESSION_INITIALIZATION, handleSessionInitialization);
    };
  }, [activeSessionId, handleSessionStatusUpdate, handleSessionInitialization, isReplayMode]);

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
      sessionInitialization,
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
      modelInfo,
      agentInfo,
      workspaceInfo,
      agentOptions,

      // Session operations
      loadSessions,
      createSession,
      setActiveSession,
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
      sessionInitialization,
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
      modelInfo,
      agentInfo,
      workspaceInfo,
      agentOptions,
      loadSessions,
      createSession,
      setActiveSession,
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
