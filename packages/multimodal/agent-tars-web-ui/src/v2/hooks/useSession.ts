import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { sessionsAtom, activeSessionIdAtom } from '../state/atoms/session';
import { messagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { isProcessingAtom, activePanelContentAtom, connectionStatusAtom } from '../state/atoms/ui';
import {
  loadSessionsAction,
  createSessionAction,
  setActiveSessionAction,
  updateSessionAction,
  deleteSessionAction,
  sendMessageAction,
  abortQueryAction,
  checkSessionStatusAction, // 新增引用
} from '../state/actions/sessionActions';
import {
  initConnectionMonitoringAction,
  checkConnectionStatusAction,
} from '../state/actions/connectionActions';
import { socketService } from '../services/socketService';
import { useEffect, useCallback } from 'react'; // 添加React hook引用

/**
 * Hook for session management functionality
 *
 * Provides:
 * - Session state (list, active session, connection status)
 * - Session operations (create, load, activate, update, delete)
 * - Message operations (send, abort)
 * - Connection monitoring
 * - Periodic status checking for active sessions
 */
export function useSession() {
  // State
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const messages = useAtomValue(messagesAtom);
  const toolResults = useAtomValue(toolResultsAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);

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

  // Periodic status checking for active session
  useEffect(() => {
    if (!activeSessionId || !connectionStatus.connected) return;
    
    // Initial status check when session becomes active
    checkSessionStatus(activeSessionId);
    
    // Set up periodic status checking
    const intervalId = setInterval(() => {
      if (connectionStatus.connected) {
        checkSessionStatus(activeSessionId);
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [activeSessionId, connectionStatus.connected, checkSessionStatus]);

  // 增强的socket处理器，用于同步会话状态
  const handleSessionStatusUpdate = useCallback((status: any) => {
    console.log('Received status update:', status);
    if (status && typeof status.isProcessing === 'boolean') {
      setIsProcessing(status.isProcessing);
    }
  }, [setIsProcessing]);

  // 设置socket事件处理器，当活跃会话改变时
  useEffect(() => {
    if (!activeSessionId || !socketService.isConnected()) return;
    
    console.log(`Setting up socket event handlers for session: ${activeSessionId}`);
    
    // 加入会话并监听状态更新
    socketService.joinSession(
      activeSessionId,
      () => {/* 现有事件处理 */}, 
      handleSessionStatusUpdate
    );
    
    // 注册全局状态处理器
    socketService.on('agent-status', handleSessionStatusUpdate);
    
    return () => {
      // 清除处理器
      socketService.off('agent-status', handleSessionStatusUpdate);
    };
  }, [activeSessionId, handleSessionStatusUpdate]);

  return {
    // State
    sessions,
    activeSessionId,
    messages,
    toolResults,
    isProcessing,
    activePanelContent,
    connectionStatus,

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
  };
}