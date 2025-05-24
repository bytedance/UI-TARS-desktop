// Export all state and actions
export * from './atoms/sessionAtoms';
export * from './atoms/sessionActions';
export * from './atoms/eventHandlers';
export * from './atoms/connectionActions';

// Create more convenient hooks
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  sessionsAtom,
  activeSessionIdAtom,
  messagesAtom,
  toolResultsAtom,
  isProcessingAtom,
  activePanelContentAtom,
  serverConnectionStatusAtom,
  PanelContent,
} from './atoms/sessionAtoms';
import {
  loadSessionsAction,
  createNewSessionAction,
  setActiveSessionAction,
  updateSessionMetadataAction,
  deleteSessionAction,
  sendMessageAction,
  abortCurrentQueryAction,
  resetSessionsAction,
} from './atoms/sessionActions';
import {
  processEventBatch,
  getToolResultForCall,
  handleEventWithSummary,
} from './atoms/eventHandlers';
import { checkServerStatusAction, initConnectionMonitoringAction } from './atoms/connectionActions';

// Create a custom hook to provide a sessionStore-like API
export const useSessionStore = () => {
  // State
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const messages = useAtomValue(messagesAtom);
  const toolResults = useAtomValue(toolResultsAtom);
  const isProcessing = useAtomValue(isProcessingAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);
  const [serverConnectionStatus, setServerConnectionStatus] = useAtom(serverConnectionStatusAtom);

  // Actions
  const loadSessions = useSetAtom(loadSessionsAction);
  const createNewSession = useSetAtom(createNewSessionAction);
  const setActiveSession = useSetAtom(setActiveSessionAction);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const deleteSession = useSetAtom(deleteSessionAction);
  const sendMessage = useSetAtom(sendMessageAction);
  const abortCurrentQuery = useSetAtom(abortCurrentQueryAction);
  const resetSessions = useSetAtom(resetSessionsAction);
  const processEvents = useSetAtom(processEventBatch);
  const checkServerStatus = useSetAtom(checkServerStatusAction);
  const initConnectionMonitoring = useSetAtom(initConnectionMonitoringAction);

  return {
    // State
    sessions,
    activeSessionId,
    messages,
    toolResults,
    isProcessing,
    activePanelContent,
    serverConnectionStatus,

    // Actions
    loadSessions,
    createNewSession,
    setActiveSession,
    updateSessionMetadata,
    deleteSession,
    sendMessage,
    abortCurrentQuery,
    resetSessions,
    processEvents,
    setActivePanelContent,
    checkServerStatus,
    initConnectionMonitoring,

    // Helper functions
    getToolResultForCall,
    handleEventWithSummary,
  };
};
