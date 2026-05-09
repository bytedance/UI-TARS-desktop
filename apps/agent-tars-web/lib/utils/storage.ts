import { Session, Message } from '@/lib/types';

const SESSIONS_KEY = 'agent:sessions';
const SESSION_MESSAGES_KEY = (sessionId: string) => `agent:messages:${sessionId}`;

export const storage = {
  // Sessions
  async getSessions(): Promise<Session[]> {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(SESSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveSession(session: Session): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const sessions = await this.getSessions();
      const index = sessions.findIndex(s => s.id === session.id);
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('[v0] Failed to save session:', e);
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const sessions = await this.getSessions();
      const filtered = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
      localStorage.removeItem(SESSION_MESSAGES_KEY(sessionId));
    } catch (e) {
      console.error('[v0] Failed to delete session:', e);
    }
  },

  // Messages
  async getMessages(sessionId: string): Promise<Message[]> {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(SESSION_MESSAGES_KEY(sessionId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveMessage(sessionId: string, message: Message): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const messages = await this.getMessages(sessionId);
      messages.push(message);
      localStorage.setItem(SESSION_MESSAGES_KEY(sessionId), JSON.stringify(messages));
    } catch (e) {
      console.error('[v0] Failed to save message:', e);
    }
  },

  async updateMessage(sessionId: string, messageId: string, updates: Partial<Message>): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const messages = await this.getMessages(sessionId);
      const index = messages.findIndex(m => m.id === messageId);
      if (index >= 0) {
        messages[index] = { ...messages[index], ...updates };
        localStorage.setItem(SESSION_MESSAGES_KEY(sessionId), JSON.stringify(messages));
      }
    } catch (e) {
      console.error('[v0] Failed to update message:', e);
    }
  },

  async clearMessages(sessionId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(SESSION_MESSAGES_KEY(sessionId));
    } catch (e) {
      console.error('[v0] Failed to clear messages:', e);
    }
  },
};
