'use client';

import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { Session } from '@/lib/types';
import { sessionsAtom, currentSessionAtom, messagesAtom } from '@/lib/store/atoms/session';
import { storage } from '@/lib/utils/storage';

export function useSessions() {
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [, setCurrentSession] = useAtom(currentSessionAtom);
  const [, setMessages] = useAtom(messagesAtom);

  const createSession = useCallback(async () => {
    const session: Session = {
      id: `session-${Date.now()}`,
      title: 'New Session',
      created: Date.now(),
      updated: Date.now(),
    };

    setSessions([...sessions, session]);
    await storage.saveSession(session);
    setCurrentSession(session);
    setMessages([]);
    
    return session;
  }, [sessions, setSessions, setCurrentSession, setMessages]);

  const selectSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      setCurrentSession(session);
      const messages = await storage.getMessages(sessionId);
      setMessages(messages);
    },
    [sessions, setCurrentSession, setMessages]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      setSessions(sessions.filter(s => s.id !== sessionId));
      await storage.deleteSession(sessionId);
      setCurrentSession(null);
      setMessages([]);
    },
    [sessions, setSessions, setCurrentSession, setMessages]
  );

  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      const updated = sessions.map(s =>
        s.id === sessionId ? { ...s, title, updated: Date.now() } : s
      );
      setSessions(updated);
      await storage.saveSession(updated.find(s => s.id === sessionId)!);
    },
    [sessions, setSessions]
  );

  return {
    sessions,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
  };
}
