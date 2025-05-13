import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Chat } from '../types';
import { useChatStorage } from './ChatStorageContext';

interface ChatContextType {
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  currentChat: Chat | null;
  setCurrentChat: React.Dispatch<React.SetStateAction<Chat | null>>;
  saveChat: (chat: Chat) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const storage = useChatStorage();

  /**
   * 初始化加载聊天记录
   */
  useEffect(() => {
    storage.getChats().then(setChats);
  }, []);

  /**
   * 保存聊天记录
   * @param chat
   */
  const saveChat = async (chat: Chat): Promise<void> => {
    await storage.saveChat(chat);
    setChats((prev) => {
      const index = prev.findIndex((c) => c.id === chat.id);
      if (index >= 0) {
        return prev.map((c) => (c.id === chat.id ? chat : c));
      }
      return [...prev, chat];
    });
  };

  /**
   * 删除聊天记录
   * @param chatId
   */
  const deleteChat = async (chatId: string): Promise<void> => {
    await storage.deleteChat(chatId);
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (currentChat?.id === chatId) {
      setCurrentChat(null);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        setChats,
        currentChat,
        setCurrentChat,
        saveChat,
        deleteChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
