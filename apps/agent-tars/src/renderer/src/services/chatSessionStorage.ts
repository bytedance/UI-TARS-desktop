import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession } from '@renderer/components/LeftSidebar/type';

const chatSessionsStore = localforage.createInstance({
  name: 'chatSessions',
  description: 'Storage for chat sessions',
});

export async function getSessions(appId: string): Promise<ChatSession[]> {
  try {
    const allSessions =
      (await chatSessionsStore.getItem<Record<string, ChatSession[]>>(
        'sessions',
      )) || {};
    return allSessions[appId] || [];
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
}

export async function createSession(
  sessionData: Omit<ChatSession, 'id'>,
): Promise<ChatSession> {
  try {
    const newSession: ChatSession = {
      ...sessionData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const allSessions =
      (await chatSessionsStore.getItem<Record<string, ChatSession[]>>(
        'sessions',
      )) || {};
    const appSessions = allSessions[sessionData.appId] || [];

    allSessions[sessionData.appId] = [...appSessions, newSession];

    await chatSessionsStore.setItem('sessions', allSessions);

    return newSession;
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error('Failed to create chat session');
  }
}

export async function updateSession(
  sessionId: string,
  newSessionData: Partial<ChatSession>,
): Promise<void> {
  try {
    const allSessions =
      (await chatSessionsStore.getItem<Record<string, ChatSession[]>>(
        'sessions',
      )) || {};

    let sessionUpdated = false;

    for (const appId in allSessions) {
      allSessions[appId] = allSessions[appId].map((session) => {
        if (session.id === sessionId) {
          sessionUpdated = true;
          return {
            ...session,
            ...newSessionData,
            updatedAt: new Date().toISOString(),
          };
        }
        return session;
      });
    }

    if (!sessionUpdated) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    await chatSessionsStore.setItem('sessions', allSessions);
  } catch (error) {
    console.error('Error updating session:', error);
    throw new Error('Failed to update chat session');
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const allSessions =
      (await chatSessionsStore.getItem<Record<string, ChatSession[]>>(
        'sessions',
      )) || {};

    let sessionDeleted = false;

    for (const appId in allSessions) {
      const originalLength = allSessions[appId].length;
      allSessions[appId] = allSessions[appId].filter(
        (session) => session.id !== sessionId,
      );

      if (allSessions[appId].length < originalLength) {
        sessionDeleted = true;
      }
    }

    if (!sessionDeleted) {
      throw new Error(`Session with id ${sessionId} not found`);
    }

    await chatSessionsStore.setItem('sessions', allSessions);
  } catch (error) {
    console.error('Error deleting session:', error);
    throw new Error('Failed to delete chat session');
  }
}
