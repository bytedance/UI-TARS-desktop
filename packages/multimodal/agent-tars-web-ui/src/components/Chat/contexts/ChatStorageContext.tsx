import React, { createContext, useContext } from 'react';
import type { ChatStorage } from '../types';

const ChatStorageContext = createContext<ChatStorage | null>(null);

export function ChatStorageProvider({
  storage,
  children,
}: {
  storage: ChatStorage;
  children: React.ReactNode;
}) {
  return <ChatStorageContext.Provider value={storage}>{children}</ChatStorageContext.Provider>;
}

export function useChatStorage() {
  const context = useContext(ChatStorageContext);
  if (!context) {
    throw new Error('useChatStorage must be used within a ChatStorageProvider');
  }
  return context;
}
