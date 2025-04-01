import { ChatSession } from '@renderer/components/LeftSidebar/type';
import { useAtom, atom } from 'jotai';
import { useCallback } from 'react';
import {
  createSession,
  deleteSession,
  getSessions,
  updateSession,
} from '@renderer/services/chatSessionStorage';

// Create atoms for each app's chat sessions and current session ID
const createAppAtoms = () => {
  const chatSessionsAtom = atom<ChatSession[]>([]);
  const currentSessionIdAtom = atom<string | null>(null);
  const initStateRefAtom = atom<{
    current: 'pending' | 'loading' | 'finished';
  }>({ current: 'pending' });
  return { chatSessionsAtom, currentSessionIdAtom, initStateRefAtom };
};

// Create a map to store atoms for each app
const appAtomsMap = new Map<string, ReturnType<typeof createAppAtoms>>();

// eslint-disable-next-line max-lines-per-function
export function useChatSessions({
  appId,
  origin,
  onSwitchSession,
}: {
  appId: string;
  origin?: string;
  onSwitchSession?: (session: ChatSession) => void | Promise<void>;
}) {
  // Get or create atoms for the current app
  if (!appAtomsMap.has(appId)) {
    appAtomsMap.set(appId, createAppAtoms());
  }
  const { chatSessionsAtom, currentSessionIdAtom, initStateRefAtom } =
    appAtomsMap.get(appId)!;

  const [chatSessions, setChatSessions] = useAtom(chatSessionsAtom);
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom);
  const [initStateRef] = useAtom(initStateRefAtom);

  const updateChatSession = useCallback(
    async (
      sessionId: string,
      newSessionData: Partial<ChatSession>,
      options: {
        shouldSyncRemote: boolean;
      } = { shouldSyncRemote: true },
    ) => {
      if (options.shouldSyncRemote) {
        await updateSession(sessionId, newSessionData);
      }
      setChatSessions((sessions) =>
        sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                ...newSessionData,
              }
            : session,
        ),
      );
    },
    [setChatSessions],
  );

  const updateCurrentSessionId = useCallback(
    async (newSessionId: string, callback?: () => void) => {
      setCurrentSessionId(newSessionId);
      localStorage.setItem(`${appId}-current-chat-session-id`, newSessionId);
      const targetSession = chatSessions.find(
        (session) => session.id === newSessionId,
      );
      await onSwitchSession?.(targetSession!);
      callback?.();
    },
    [appId, setCurrentSessionId, chatSessions],
  );

  const addNewSession = useCallback(
    async (sessionData: Omit<ChatSession, 'id'>) => {
      const newSession = await createSession(sessionData);
      setChatSessions((sessions) => [...sessions, newSession]);
      updateCurrentSessionId(newSession.id!);
    },
    [setChatSessions, updateCurrentSessionId],
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId);
      setChatSessions((sessions) => {
        const updatedSessions = sessions.filter(
          (session) => session.id !== sessionId,
        );
        if (sessionId === currentSessionId && updatedSessions.length > 0) {
          updateCurrentSessionId(
            updatedSessions[updatedSessions.length - 1].id!,
          );
        } else if (updatedSessions.length === 0) {
          setCurrentSessionId(null);
          localStorage.removeItem(`${appId}-current-chat-session-id`);
        }
        return updatedSessions;
      });
    },
    [
      appId,
      currentSessionId,
      setChatSessions,
      setCurrentSessionId,
      updateCurrentSessionId,
    ],
  );

  const initializeSessions = useCallback(async () => {
    if (initStateRef.current === 'pending') {
      console.log('初始化 session...');
      initStateRef.current = 'loading';
      const storedCurrentSessionId = localStorage.getItem(
        `${appId}-current-chat-session-id`,
      );

      // Get all sessions from API
      const sessions = await getSessions(appId);

      if (sessions.length > 0) {
        setChatSessions(sessions);

        if (
          storedCurrentSessionId &&
          sessions.some((s) => s.id === storedCurrentSessionId)
        ) {
          // Restore previous session if it exists
          setCurrentSessionId(storedCurrentSessionId);
          await onSwitchSession?.(
            sessions.find((s) => s.id === storedCurrentSessionId)!,
          );
        } else {
          // Use the last session if stored session not found
          updateCurrentSessionId(sessions[sessions.length - 1].id!);
        }
      } else {
        // Create default session if no sessions exist
        const defaultSession = await createSession({
          appId,
          name: 'New session',
          messageCount: 0,
          origin,
        });
        setChatSessions([defaultSession]);
        updateCurrentSessionId(defaultSession.id!);
      }
    }
    initStateRef.current = 'finished';
  }, []);

  return {
    currentSessionId,
    updateChatSession,
    updateCurrentSessionId,
    addNewSession,
    chatSessions,
    removeSession,
    initializeSessions,
    initStateRef,
  };
}
