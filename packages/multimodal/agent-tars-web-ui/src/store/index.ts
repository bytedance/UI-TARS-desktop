// Export all state and actions
export * from './atoms/sessionAtoms';
export * from './atoms/sessionActions';
export * from './atoms/eventHandlers';

// Create more convenient hooks
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  sessionsAtom,
  activeSessionIdAtom,
  messagesAtom,
  toolResultsAtom,
  isProcessingAtom,
  activePanelContentAtom,
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
import { processEventBatch, getToolResultForCall } from './atoms/eventHandlers';

// Create a custom hook to provide a sessionStore-like API
export const useSessionStore = () => {
  // State
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const messages = useAtomValue(messagesAtom);
  const toolResults = useAtomValue(toolResultsAtom);
  const isProcessing = useAtomValue(isProcessingAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);

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

  return {
    // State
    sessions,
    activeSessionId,
    messages,
    toolResults,
    isProcessing,
    activePanelContent,

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

    // Helper functions
    getToolResultForCall,
  };
};
