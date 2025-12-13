import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { sessionsAtom, activeSessionIdAtom } from '../state/atoms/session';
import { messagesAtom, groupedMessagesAtom } from '../state/atoms/message';
import { toolResultsAtom } from '../state/atoms/tool';

import { sessionFilesAtom } from '../state/atoms/files';
import {
  isProcessingAtom,
  activePanelContentAtom,
  connectionStatusAtom,
  activeEmbedFrameAtom,
  workspaceDisplayStateAtom,
} from '../state/atoms/ui';
import { replayStateAtom } from '../state/atoms/replay';
import {
  loadSessionsAction,
  createSessionAction,
  setActiveSessionAction,
  updateSessionAction,
  updateSessionMetadataAction,
  deleteSessionAction,
  sendMessageAction,
  abortQueryAction,
} from '../state/actions/sessionActions';
import {
  initConnectionMonitoringAction,
  checkConnectionStatusAction,
} from '../state/actions/connectionActions';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useReplayMode } from '../hooks/useReplayMode';

export function useSession() {
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const messages = useAtomValue(messagesAtom);
  const groupedMessages = useAtomValue(groupedMessagesAtom);
  const toolResults = useAtomValue(toolResultsAtom);
  const sessionFiles = useAtomValue(sessionFilesAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [activePanelContent, setActivePanelContent] = useAtom(activePanelContentAtom);
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [activeEmbedFrame, setActiveEmbedFrame] = useAtom(activeEmbedFrameAtom);
  const [workspaceDisplayState, setWorkspaceDisplayState] = useAtom(workspaceDisplayStateAtom);

  const [replayState, setReplayState] = useAtom(replayStateAtom);

  const sessionMetadata = useMemo(() => {
    if (!activeSessionId || !sessions.length) return {};
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    return currentSession?.metadata || {};
  }, [activeSessionId, sessions]);

  const { isReplayMode } = useReplayMode();

  const loadSessions = useSetAtom(loadSessionsAction);
  const createSession = useSetAtom(createSessionAction);
  const setActiveSession = useSetAtom(setActiveSessionAction);
  const updateSessionInfo = useSetAtom(updateSessionAction);
  const updateSessionMetadata = useSetAtom(updateSessionMetadataAction);
  const deleteSession = useSetAtom(deleteSessionAction);
  const sendMessage = useSetAtom(sendMessageAction);
  const abortQuery = useSetAtom(abortQueryAction);
  const initConnectionMonitoring = useSetAtom(initConnectionMonitoringAction);
  const checkServerStatus = useSetAtom(checkConnectionStatusAction);

  const sessionState = useMemo(
    () => ({
      sessions,
      activeSessionId,
      messages,
      groupedMessages,
      toolResults,
      sessionFiles,
      isProcessing,
      activePanelContent,
      connectionStatus,
      activeEmbedFrame,
      workspaceDisplayState,

      replayState,
      sessionMetadata,

      loadSessions,
      createSession,
      setActiveSession,
      updateSessionInfo,
      updateSessionMetadata,
      deleteSession,

      sendMessage,
      abortQuery,

      setActivePanelContent,
      setActiveEmbedFrame,
      setWorkspaceDisplayState,

      initConnectionMonitoring,
      checkServerStatus,


    }),
    [
      sessions,
      activeSessionId,
      messages,
      groupedMessages,
      toolResults,
      sessionFiles,
      isProcessing,
      activePanelContent,
      connectionStatus,
      activeEmbedFrame,
      workspaceDisplayState,
      replayState,
      sessionMetadata,
      loadSessions,
      createSession,
      setActiveSession,
      updateSessionInfo,
      updateSessionMetadata,
      deleteSession,
      sendMessage,
      abortQuery,
      setActivePanelContent,
      setActiveEmbedFrame,
      setWorkspaceDisplayState,
      initConnectionMonitoring,
      checkServerStatus,
    ],
  );

  return sessionState;
}
