import { io, Socket } from 'socket.io-client';
import { Event } from '../types';

/**
 * 连接管理器
 * 负责管理与服务器的WebSocket连接，处理连接状态和事件传递
 */
export class ConnectionManager {
  private static instance: ConnectionManager;
  private socket: Socket | null = null;
  private baseUrl: string = 'http://localhost:3000';
  private heartbeatInterval: number = 15000;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private missedHeartbeats: number = 0;
  private maxMissedHeartbeats: number = 2;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  private constructor() {
    // 私有构造函数，防止直接实例化
  }

  /**
   * 获取ConnectionManager的单例实例
   */
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * 连接到服务器
   */
  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(this.baseUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    // 设置事件监听器
    this.socket.on('connect', () => this.emitEvent('connect'));
    this.socket.on('disconnect', (reason) => this.emitEvent('disconnect', reason));
    this.socket.on('error', (error) => this.emitEvent('error', error));
    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      this.emitEvent('reconnecting');
    });
    this.socket.on('reconnect_failed', () => this.emitEvent('reconnectFailed'));

    // 连接时启动心跳
    this.socket.on('connect', () => this.startHeartbeat());

    return this.socket;
  }

  /**
   * 断开与服务器的连接
   */
  public disconnect(): void {
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.missedHeartbeats = 0;
    this.reconnectAttempts = 0;
  }

  /**
   * 加入特定会话以接收其事件
   */
  public joinSession(sessionId: string, onEvent: (event: Event) => void): void {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.emit('join-session', sessionId);

      // 移除任何现有的代理事件监听器
      this.socket.off('agent-event');

      // 设置新的监听器
      this.socket.on('agent-event', ({ type, data }) => {
        if (data) {
          onEvent(data);
        }
      });
    }
  }

  /**
   * 发送查询
   */
  public sendQuery(data: { sessionId: string; query: string }): void {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('send-query', data);
  }

  /**
   * 中止查询
   */
  public abortQuery(data: { sessionId: string }): void {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('abort-query', data);
  }

  /**
   * 检查当前是否已连接到服务器
   */
  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /**
   * 注册事件监听器
   */
  public on(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);
  }

  /**
   * 移除事件监听器
   */
  public off(event: string, callback: Function): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.delete(callback);
    }
  }

  /**
   * 触发Ping以检查服务器连接
   */
  public ping(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      this.socket.emit('ping', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }

  /**
   * 发送事件到所有注册的处理程序
   */
  private emitEvent(event: string, ...args: any[]): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in ${event} event handler:`, error);
        }
      });
    }
  }

  /**
   * 启动心跳监控
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.missedHeartbeats = 0;
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatInterval);
  }

  /**
   * 停止心跳监控
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 发送心跳到服务器并跟踪响应
   */
  private sendHeartbeat(): void {
    if (!this.socket || !this.socket.connected) {
      this.missedHeartbeats++;
      if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
        console.warn(`Missed ${this.missedHeartbeats} heartbeats, connection may be down`);
        this.socket?.disconnect();
      }
      return;
    }

    this.socket.emit('ping', () => {
      this.missedHeartbeats = 0;
    });

    this.missedHeartbeats++;
    if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
      console.warn(`Missed ${this.missedHeartbeats} heartbeats, connection may be down`);
      this.socket.disconnect();
    }
  }
}
