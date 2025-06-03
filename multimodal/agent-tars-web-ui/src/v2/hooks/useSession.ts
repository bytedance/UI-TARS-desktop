import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useLocation } from 'react-router-dom';
import { sessionsAtom, activeSessionIdAtom } from '../state/atoms/session';
import { messagesAtom, groupedMessagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { plansAtom, planUIStateAtom } from '../state/atoms/plan';
import { 
  isProcessingAtom, 
  activePanelContentAtom, 
  connectionStatusAtom,
  modelInfoAtom 
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
import { fetchModelInfoAction, setModelInfoAction } from '../state/actions/modelInfoAction';
import { socketService } from '../services/socketService';

import { useEffect, useCallback, useMemo } from 'react';
import { useReplayMode, useReplayModelInfo } from '../context/ReplayModeContext';

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
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [plans, setPlans] = useAtom(plansAtom);
  const setPlanUIState = useSetAtom(planUIStateAtom);
  const [replayState, setReplayState] = useAtom(replayStateAtom);
  const modelInfo = useAtomValue(modelInfoAtom);

  // Check if we're in replay mode using the context hook
  const isReplayMode = useReplayMode();
  // 获取回放模式下的模型信息
  const replayModelInfo = useReplayModelInfo();

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
  const fetchModelInfo = useSetAtom(fetchModelInfoAction);
  const setModelInfo = useSetAtom(setModelInfoAction);

  // Get current location
  const location = useLocation();

  // 保留这个工具函数，但移除自动同步逻辑
  const getSessionIdFromUrl = useCallback(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    return pathParts.length > 0 ? pathParts[0] : null;
  }, [location]);

  // Periodic status checking for active session - 在回放模式下不检查状态
  useEffect(() => {
    if (!activeSessionId || !connectionStatus.connected || isReplayMode) return;

    // Initial status check when session becomes active
    checkSessionStatus(activeSessionId);
  }, [activeSessionId, connectionStatus.connected, checkSessionStatus, isReplayMode]);

  // Enhanced socket handler for session status sync - 在回放模式下不更新状态
  const handleSessionStatusUpdate = useCallback(
    (status: any) => {
      if (status && typeof status.isProcessing === 'boolean' && !isReplayMode) {
        setIsProcessing(status.isProcessing);
      }
    },
    [setIsProcessing, isReplayMode],
  );

  // Set up socket event handlers when active session changes - 在回放模式下不设置socket事件处理
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

  // Auto-show plan when it's first created - 在回放模式下不自动显示计划
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

  // 添加获取模型信息的效果
  useEffect(() => {
    // 在回放模式下使用回放模式的模型信息
    if (isReplayMode && replayModelInfo) {
      setModelInfo(replayModelInfo);
      return;
    }

    // 在回放模式或未连接时不获取模型信息
    if (isReplayMode || !connectionStatus.connected) return;

    // 使用新的 action 获取模型信息
    fetchModelInfo();
  }, [connectionStatus.connected, isReplayMode, replayModelInfo, fetchModelInfo, setModelInfo]);

  // Memoize the session state object to avoid unnecessary re-renders
  const sessionState = useMemo(
    () => ({
      // State
      sessions,
      activeSessionId,
      messages,
      groupedMessages,
      toolResults,
      isProcessing,
      activePanelContent,
      connectionStatus,
      plans,
      replayState,
      modelInfo, // Now from atom

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
      getSessionIdFromUrl,
    }),
    [
      sessions,
      activeSessionId,
      messages,
      groupedMessages,
      toolResults,
      isProcessing,
      activePanelContent,
      connectionStatus,
      plans,
      replayState,
      modelInfo,
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
      getSessionIdFromUrl,
    ],
  );

  return sessionState;
}