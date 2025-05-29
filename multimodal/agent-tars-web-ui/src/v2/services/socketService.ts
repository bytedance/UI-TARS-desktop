import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_EVENTS, CONNECTION_SETTINGS } from '../constants';
import { Event } from '../types';

/**
 * Socket Service - Manages WebSocket connection with server
 */
class SocketService {
  private socket: Socket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private missedHeartbeats = 0;
  private reconnectAttempts = 0;
  private eventHandlers: Record<string, Array<(...args: any[]) => void>> = {};

  /**
   * Connect to the WebSocket server
   */
  connect(): Socket | null {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(API_BASE_URL, {
      reconnection: true,
      reconnectionDelay: CONNECTION_SETTINGS.RECONNECTION_DELAY,
      reconnectionDelayMax: CONNECTION_SETTINGS.RECONNECTION_DELAY_MAX,
      reconnectionAttempts: CONNECTION_SETTINGS.MAX_RECONNECT_ATTEMPTS,
    });

    // Set up core event handlers
    this.setupEventHandlers();

    return this.socket;
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.missedHeartbeats = 0;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if currently connected to the server
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Join a specific session to receive its events
   */
  joinSession(
    sessionId: string,
    onEvent: (event: Event) => void,
    onStatusUpdate: (status: any) => void,
  ): void {
    if (!this.socket) {
      this.connect();
    }

    if (!this.socket) return;

    console.log(`Joining session: ${sessionId}`);
    this.socket.emit(SOCKET_EVENTS.JOIN_SESSION, sessionId);

    // 清理现有监听器
    this.socket.off(SOCKET_EVENTS.AGENT_EVENT);
    this.socket.off(SOCKET_EVENTS.AGENT_STATUS);

    // 设置事件监听器
    this.socket.on(SOCKET_EVENTS.AGENT_EVENT, ({ type, data }) => {
      if (data) {
        onEvent(data);
      }
    });

    // 增强状态更新处理
    this.socket.on(SOCKET_EVENTS.AGENT_STATUS, (status) => {
      console.log('Received agent status:', status);
      onStatusUpdate(status);
      
      // 触发全局事件以同步应用中的所有组件
      this.notifyEventHandlers(SOCKET_EVENTS.AGENT_STATUS, status);
    });

    // 立即请求当前状态
    this.socket.emit('request-status', { sessionId });
  }

  /**
   * Send a query to the server
   */
  sendQuery(params: { sessionId: string; query: string }): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit(SOCKET_EVENTS.SEND_QUERY, params);
  }

  /**
   * Abort the current query
   */
  abortQuery(params: { sessionId: string }): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit(SOCKET_EVENTS.ABORT_QUERY, params);
  }

  /**
   * Add an event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }

    this.eventHandlers[event].push(callback);

    // If we already have a socket, add the listener directly
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback: (...args: any[]) => void): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter((cb) => cb !== callback);
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Send a ping to check server connectivity
   */
  ping(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      this.socket.emit(SOCKET_EVENTS.PING, () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }

  /**
   * Get the socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Set up event handlers for the socket connection
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.CONNECT, this.handleConnect);
    this.socket.on(SOCKET_EVENTS.DISCONNECT, this.handleDisconnect);
    this.socket.on(SOCKET_EVENTS.ERROR, this.handleError);
    this.socket.on(SOCKET_EVENTS.RECONNECT_ATTEMPT, this.handleReconnectAttempt);
    this.socket.on(SOCKET_EVENTS.RECONNECT_FAILED, this.handleReconnectFailed);

    // Apply any event handlers that were registered before connecting
    Object.entries(this.eventHandlers).forEach(([event, handlers]) => {
      handlers.forEach((handler) => {
        this.socket?.on(event, handler);
      });
    });
  }

  /**
   * Handle successful connection
   */
  private handleConnect = (): void => {
    console.log('Connected to server');
    this.missedHeartbeats = 0;
    this.reconnectAttempts = 0;
    this.startHeartbeat();

    // Notify event handlers
    this.notifyEventHandlers(SOCKET_EVENTS.CONNECT);
  };

  /**
   * Handle disconnection
   */
  private handleDisconnect = (reason: string): void => {
    console.log('Disconnected from server:', reason);
    this.stopHeartbeat();

    // Notify event handlers
    this.notifyEventHandlers(SOCKET_EVENTS.DISCONNECT, reason);
  };

  /**
   * Handle connection errors
   */
  private handleError = (error: any): void => {
    console.error('Socket error:', error);

    // Notify event handlers
    this.notifyEventHandlers(SOCKET_EVENTS.ERROR, error);
  };

  /**
   * Handle reconnection attempts
   */
  private handleReconnectAttempt = (): void => {
    this.reconnectAttempts++;
    console.log(
      `Reconnection attempt ${this.reconnectAttempts}/${CONNECTION_SETTINGS.MAX_RECONNECT_ATTEMPTS}`,
    );

    // Notify event handlers
    this.notifyEventHandlers(SOCKET_EVENTS.RECONNECT_ATTEMPT, this.reconnectAttempts);
  };

  /**
   * Handle failed reconnection
   */
  private handleReconnectFailed = (): void => {
    console.log('Failed to reconnect after multiple attempts');

    // Notify event handlers
    this.notifyEventHandlers(SOCKET_EVENTS.RECONNECT_FAILED);
  };

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.missedHeartbeats = 0;

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, CONNECTION_SETTINGS.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send heartbeat to server and track response
   */
  private sendHeartbeat(): void {
    if (!this.socket || !this.socket.connected) {
      this.missedHeartbeats++;

      if (this.missedHeartbeats >= CONNECTION_SETTINGS.MAX_MISSED_HEARTBEATS) {
        console.warn(`Missed ${this.missedHeartbeats} heartbeats, connection may be down`);
        this.socket?.disconnect();
      }
      return;
    }

    this.socket.emit(SOCKET_EVENTS.PING, () => {
      this.missedHeartbeats = 0;
    });

    // Increment counter - will be reset when we get a response
    this.missedHeartbeats++;

    if (this.missedHeartbeats >= CONNECTION_SETTINGS.MAX_MISSED_HEARTBEATS) {
      console.warn(`Missed ${this.missedHeartbeats} heartbeats, connection may be down`);
      this.socket.disconnect();
    }
  }

  /**
   * Notify all registered event handlers for a specific event
   */
  private notifyEventHandlers(event: string, ...args: any[]): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} event handler:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();