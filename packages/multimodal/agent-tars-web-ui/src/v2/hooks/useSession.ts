import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useLocation } from 'react-router-dom';
import { sessionsAtom, activeSessionIdAtom } from '../state/atoms/session';
import { messagesAtom, groupedMessagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { plansAtom, planUIStateAtom } from '../state/atoms/plan';
import { isProcessingAtom, activePanelContentAtom, connectionStatusAtom } from '../state/atoms/ui';
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
import { useEffect, useCallback } from 'react';
import { EventType } from '../types';

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

  // Get current location
  const location = useLocation();

  // 保留这个工具函数，但移除自动同步逻辑
  const getSessionIdFromUrl = useCallback(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    return pathParts.length > 0 ? pathParts[0] : null;
  }, [location]);

  // 删除自动从URL加载session的useEffect

  // Periodic status checking for active session - 在回放模式下不检查状态
  useEffect(() => {
    if (!activeSessionId || !connectionStatus.connected || replayState.isActive) return;
    
    // Initial status check when session becomes active
    checkSessionStatus(activeSessionId);
    
    // Set up periodic status checking
    const intervalId = setInterval(() => {
      if (connectionStatus.connected && !replayState.isActive) {
        checkSessionStatus(activeSessionId);
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [activeSessionId, connectionStatus.connected, checkSessionStatus, replayState.isActive]);

  // Enhanced socket handler for session status sync - 在回放模式下不更新状态
  const handleSessionStatusUpdate = useCallback((status: any) => {
    console.log('Received status update:', status);
    if (status && typeof status.isProcessing === 'boolean' && !replayState.isActive) {
      setIsProcessing(status.isProcessing);
    }
  }, [setIsProcessing, replayState.isActive]);

  // Set up socket event handlers when active session changes - 在回放模式下不设置socket事件处理
  useEffect(() => {
    if (!activeSessionId || !socketService.isConnected() || replayState.isActive) return;
    
    console.log(`Setting up socket event handlers for session: ${activeSessionId}`);
    
    // Join session and listen for status updates
    socketService.joinSession(
      activeSessionId,
      () => {/* existing event handling */}, 
      handleSessionStatusUpdate
    );
    
    // Register global status handler
    socketService.on('agent-status', handleSessionStatusUpdate);
    
    return () => {
      // Clean up handlers
      socketService.off('agent-status', handleSessionStatusUpdate);
    };
  }, [activeSessionId, handleSessionStatusUpdate, replayState.isActive]);

  // Auto-show plan when it's first created - 在回放模式下不自动显示计划
  useEffect(() => {
    if (activeSessionId && plans[activeSessionId]?.hasGeneratedPlan && !replayState.isActive) {
      const currentPlan = plans[activeSessionId];
      
      // If this is a newly generated plan, automatically show it
      if (currentPlan.steps.length > 0 && currentPlan.steps.every(step => !step.done)) {
        setPlanUIState(prev => ({
          ...prev,
          isVisible: true
        }));
      }
    }
  }, [activeSessionId, plans, setPlanUIState, replayState.isActive]);

  return {
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
  };
}
