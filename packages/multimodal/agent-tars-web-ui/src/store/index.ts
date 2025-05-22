// 导出所有状态和操作
export * from './atoms/sessionAtoms';
export * from './atoms/sessionActions';
export * from './atoms/eventHandlers';

// 创建更方便的hooks
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  sessionsAtom,
  activeSessionIdAtom,
  messagesAtom,
  toolResultsAtom,
  isProcessingAtom,
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

// 创建一个自定义hook，提供与之前的useSession相似的API
export const useSessionStore = () => {
  // 状态
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const messages = useAtomValue(messagesAtom);
  const toolResults = useAtomValue(toolResultsAtom);
  const isProcessing = useAtomValue(isProcessingAtom);

  // 操作
  const loadSessions = useSetAtom(loadSessionsAction);
  const createNewSession = useSetAtom(createNewSessionAction);
  const setActiveSession = useSetAtom(setActiveSessionAction);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const deleteSession = useSetAtom(deleteSessionAction);
  const sendMessage = useSetAtom(sendMessageAction);
  const abortCurrentQuery = useSetAtom(abortCurrentQueryAction);
  const resetSessions = useSetAtom(resetSessionsAction);

  return {
    // 状态
    sessions,
    activeSessionId,
    messages,
    toolResults,
    isProcessing,

    // 操作
    loadSessions,
    createNewSession,
    setActiveSession,
    updateSessionMetadata,
    deleteSession,
    sendMessage,
    abortCurrentQuery,
    resetSessions,
  };
};
