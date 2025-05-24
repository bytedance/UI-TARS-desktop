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
} from '../state/actions/sessionActions';
import { sendMessageAction, abortQueryAction } from '../state/actions/sessionActions';
import {
  initConnectionMonitoringAction,
  checkConnectionStatusAction,
} from '../state/actions/connectionActions';

/**
 * Hook for session management functionality
 *
 * Provides:
 * - Session state (list, active session, connection status)
 * - Session operations (create, load, activate, update, delete)
 * - Message operations (send, abort)
 * - Connection monitoring
 */
export function useSession() {
  // State
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const messages = useAtomValue(messagesAtom);
  const toolResults = useAtomValue(toolResultsAtom);
  const isProcessing = useAtomValue(isProcessingAtom);
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
  };
}
