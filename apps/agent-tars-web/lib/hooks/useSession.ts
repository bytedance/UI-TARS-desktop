'use client';

import { useAtom } from 'jotai';
import { useCallback, useRef } from 'react';
import { Message, Session } from '@/lib/types';
import { currentSessionAtom, messagesAtom, loadingAtom } from '@/lib/store/atoms/session';
import { settingsAtom } from '@/lib/store/atoms/settings';
import { AgentRunner } from '@/lib/agent/runner';
import { storage } from '@/lib/utils/storage';

export function useSession() {
  const [currentSession] = useAtom(currentSessionAtom);
  const [messages, setMessages] = useAtom(messagesAtom);
  const [settings] = useAtom(settingsAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const runnerRef = useRef<AgentRunner | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!currentSession || !settings.apiKey) return;

      setLoading(true);
      
      try {
        // Add user message
        const userMsg: Message = {
          id: `${Date.now()}-user`,
          sessionId: currentSession.id,
          role: 'user',
          content: userMessage,
          timestamp: Date.now(),
        };

        setMessages([...messages, userMsg]);
        await storage.saveMessage(currentSession.id, userMsg);

        // Create agent runner
        runnerRef.current = new AgentRunner({
          settings,
          sessionId: currentSession.id,
          onMessage: (message: Message) => {
            setMessages(prev => {
              const updated = [...prev];
              const existingIndex = updated.findIndex(m => m.id === message.id);
              if (existingIndex >= 0) {
                updated[existingIndex] = message;
              } else {
                updated.push(message);
              }
              return updated;
            });
            storage.saveMessage(currentSession.id, message);
          },
          onError: (error: Error) => {
            console.error('[v0] Agent error:', error);
            const errorMsg: Message = {
              id: `${Date.now()}-error`,
              sessionId: currentSession.id,
              role: 'system',
              content: `Error: ${error.message}`,
              timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
          },
        });

        // Run agent
        await runnerRef.current.run(userMessage, messages);
      } finally {
        setLoading(false);
      }
    },
    [currentSession, messages, settings, setMessages, setLoading]
  );

  const abortRunning = useCallback(() => {
    runnerRef.current?.abort();
    setLoading(false);
  }, [setLoading]);

  return {
    session: currentSession,
    messages,
    loading,
    sendMessage,
    abort: abortRunning,
  };
}
