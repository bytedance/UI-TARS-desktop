import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useLocation } from 'react-router-dom';
import { sessionsAtom, activeSessionIdAtom } from '../state/atoms/session';
import { messagesAtom, groupedMessagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';
import { plansAtom, planUIStateAtom } from '../state/atoms/plan';
import { isProcessingAtom, activePanelContentAtom, connectionStatusAtom } from '../state/atoms/ui';
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
  const groupedMessages = useAtomValue(groupedMessagesAtom);
  const toolResults = useAtomValue(toolResultsAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [plans, setPlans] = useAtom(plansAtom);
  const setPlanUIState = useSetAtom(planUIStateAtom);

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

  // Get current location to extract session ID from URL
  const location = useLocation();

  // Extract session ID from URL when needed
  const getSessionIdFromUrl = useCallback(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    return pathParts.length > 0 ? pathParts[0] : null;
  }, [location]);

  // Initialize from URL if needed
  useEffect(() => {
    const urlSessionId = getSessionIdFromUrl();
    
    if (urlSessionId && urlSessionId !== activeSessionId && connectionStatus.connected) {
      // Check if this session exists in our loaded sessions
      const sessionExists = sessions.some(session => session.id === urlSessionId);
      
      if (sessionExists) {
        setActiveSession(urlSessionId).catch(error => {
          console.error(`Failed to load session from URL (${urlSessionId}):`, error);
        });
      }
    }
  }, [location, sessions, activeSessionId, connectionStatus.connected, getSessionIdFromUrl, setActiveSession]);

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

  // Enhanced socket handler for session status sync
  const handleSessionStatusUpdate = useCallback((status: any) => {
    console.log('Received status update:', status);
    if (status && typeof status.isProcessing === 'boolean') {
      setIsProcessing(status.isProcessing);
    }
  }, [setIsProcessing]);

  // Set up socket event handlers when active session changes
  useEffect(() => {
    if (!activeSessionId || !socketService.isConnected()) return;
    
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
  }, [activeSessionId, handleSessionStatusUpdate]);

  // Auto-show plan when it's first created
  useEffect(() => {
    if (activeSessionId && plans[activeSessionId]?.hasGeneratedPlan) {
      const currentPlan = plans[activeSessionId];
      
      // If this is a newly generated plan, automatically show it
      if (currentPlan.steps.length > 0 && currentPlan.steps.every(step => !step.done)) {
        setPlanUIState(prev => ({
          ...prev,
          isVisible: true
        }));
      }
    }
  }, [activeSessionId, plans, setPlanUIState]);

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