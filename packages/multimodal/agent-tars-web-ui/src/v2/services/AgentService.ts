import { ConnectionManager } from './ConnectionManager';
import { Event } from '../types';

/**
 * Agent服务
 * 处理与Agent交互相关的API请求
 */
export class AgentService {
  private baseUrl: string = 'http://localhost:3000';

  constructor(private connectionManager: ConnectionManager) {}

  /**
   * 发送流式查询
   * 使用Server-Sent Events获取流式响应
   */
  async sendStreamingQuery(
    sessionId: string,
    query: string,
    onEvent: (event: Event) => void,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send query: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              onEvent(eventData);
            } catch (e) {
              console.error('Error parsing event data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming query:', error);
      throw error;
    }
  }

  /**
   * 通过Socket发送查询
   */
  sendSocketQuery(sessionId: string, query: string): void {
    this.connectionManager.sendQuery({ sessionId, query });
  }

  /**
   * 发送非流式查询
   */
  async sendQuery(sessionId: string, query: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send query: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error sending query:', error);
      throw error;
    }
  }

  /**
   * 中止当前查询
   */
  async abortQuery(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to abort query: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error aborting query:', error);
      throw error;
    }
  }

  /**
   * 通过Socket中止查询
   */
  abortSocketQuery(sessionId: string): void {
    this.connectionManager.abortQuery({ sessionId });
  }
}
