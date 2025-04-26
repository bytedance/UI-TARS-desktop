/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// /apps/ui-tars/src/renderer/src/hooks/useSession.ts
import { useSessionStore } from '@renderer/store/session';
import { useEffect } from 'react';

export const useSession = () => {
  const store = useSessionStore();

  // 初始加载
  useEffect(() => {
    store.fetchSessions();
  }, []);

  return {
    loading: store.loading,
    error: store.error,
    currentSessionId: store.currentSessionId,
    sessions: store.sessions,
    chatMessages: store.chatMessages,

    setCurrentSessionId: store.setCurrentSessionId,

    createMessage: store.createMessage,
    updateMessages: store.updateMessages,
    deleteMessages: store.deleteMessages,

    setActiveSession: store.setActiveSession,
    createSession: store.createSession,
    updateSession: store.updateSession,
    deleteSession: store.deleteSession,
    refreshSessions: store.fetchSessions,
  };
};
