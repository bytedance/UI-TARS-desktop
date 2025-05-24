import { ConnectionManager } from './ConnectionManager';
import { SessionInfo, SessionMetadata } from '../types';

/**
 * 会话服务
 * 处理会话管理相关API请求
 */
export class SessionService {
  private baseUrl: string = 'http://localhost:3000';

  constructor(private connectionManager: ConnectionManager) {}

  /**
   * 创建新会话
   */
  async createSession(): Promise<SessionInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const { sessionId } = await response.json();
      return this.getSessionDetails(sessionId);
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * 获取所有会话
   */
  async getSessions(): Promise<SessionInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to get sessions: ${response.statusText}`);
      }

      const { sessions } = await response.json();
      return sessions;
    } catch (error) {
      console.error('Error getting sessions:', error);
      throw error;
    }
  }

  /**
   * 获取会话详情
   */
  async getSessionDetails(sessionId: string): Promise<SessionInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/details?sessionId=${sessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to get session details: ${response.statusText}`);
      }

      const { session } = await response.json();
      return session;
    } catch (error) {
      console.error('Error getting session details:', error);
      throw error;
    }
  }

  /**
   * 获取会话事件
   */
  async getSessionEvents(sessionId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/events?sessionId=${sessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to get session events: ${response.statusText}`);
      }

      const { events } = await response.json();
      return events;
    } catch (error) {
      console.error('Error getting session events:', error);
      throw error;
    }
  }

  /**
   * 更新会话元数据
   */
  async updateSession(
    sessionId: string,
    updates: { name?: string; tags?: string[] },
  ): Promise<SessionInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...updates }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.statusText}`);
      }

      const { session } = await response.json();
      return session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }

      const { success } = await response.json();
      return success;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * 恢复会话
   */
  async restoreSession(sessionId: string): Promise<SessionInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to restore session: ${response.statusText}`);
      }

      const { success, session } = await response.json();

      if (!success) {
        throw new Error('Failed to restore session');
      }

      return session;
    } catch (error) {
      console.error('Error restoring session:', error);
      throw error;
    }
  }

  /**
   * 生成会话摘要
   */
  async generateSummary(sessionId: string, messages: any[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messages }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.statusText}`);
      }

      const { summary } = await response.json();
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Untitled Conversation';
    }
  }

  /**
   * 检查服务器状态
   */
  async checkServerStatus(): Promise<boolean> {
    try {
      // 首先尝试通过socket ping，如果已连接
      if (this.connectionManager.isConnected()) {
        const pingSuccessful = await this.connectionManager.ping();
        if (pingSuccessful) return true;
      }

      // 如果socket ping失败，则退回到基本fetch请求
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // 短超时以避免长时间等待
        signal: AbortSignal.timeout(3000),
      });

      return response.ok;
    } catch (error) {
      console.error('Error checking server status:', error);
      return false;
    }
  }
}
