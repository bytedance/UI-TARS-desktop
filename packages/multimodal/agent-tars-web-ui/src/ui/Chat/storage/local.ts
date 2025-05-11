import type { Chat, ChatStorage } from '../types';

const STORAGE_KEY = 'chat_storage';

export class LocalChatStorage implements ChatStorage {
  async getChats(): Promise<Chat[]> {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async saveChat(chat: Chat): Promise<void> {
    const chats = await this.getChats();
    const index = chats.findIndex((c) => c.id === chat.id);

    if (index >= 0) {
      chats[index] = chat;
    } else {
      chats.push(chat);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }

  async deleteChat(chatId: string): Promise<void> {
    const chats = await this.getChats();
    const filtered = chats.filter((chat) => chat.id !== chatId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }
}
