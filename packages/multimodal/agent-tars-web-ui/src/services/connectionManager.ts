import { io, Socket } from 'socket.io-client';
import { Event } from '../types';

/**
 * ConnectionManager - Manages WebSocket connections with server and provides health monitoring
 *
 * Features:
 * - Auto-reconnection with configurable retry strategy
 * - Connection health monitoring via heartbeats
 * - Connection status events
 * - Session-specific event handling
 */
export class ConnectionManager {
  private static instance: ConnectionManager;
  private socket: Socket | null = null;
  private baseUrl: string;
  private heartbeatInterval: number = 15000; // 15 seconds
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private missedHeartbeats: number = 0;
  private maxMissedHeartbeats: number = 2;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private listeners: {
    onConnect: (() => void)[];
    onDisconnect: ((reason: string) => void)[];
    onError: ((error: any) => void)[];
    onReconnecting: (() => void)[];
    onReconnectFailed: (() => void)[];
  } = {
    onConnect: [],
    onDisconnect: [],
    onError: [],
    onReconnecting: [],
    onReconnectFailed: [],
  };

  private constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get the singleton instance of ConnectionManager
   */
  public static getInstance(baseUrl?: string): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager(baseUrl);
    }
    return ConnectionManager.instance;
  }

  /**
   * Connect to the server and initialize connection monitoring
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

    // Set up event listeners
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('error', this.handleError.bind(this));
    this.socket.on('reconnect_attempt', this.handleReconnectAttempt.bind(this));
    this.socket.on('reconnect_failed', this.handleReconnectFailed.bind(this));

    // Start heartbeat when connected
    this.socket.on('connect', this.startHeartbeat.bind(this));

    return this.socket;
  }

  /**
   * Disconnect from the server and clean up resources
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
   * Join a specific session to receive its events
   */
  public joinSession(sessionId: string, onEvent: (event: Event) => void): void {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.emit('join-session', sessionId);

      // Remove any existing listeners for agent events
      this.socket.off('agent-event');

      // Set up new listener
      this.socket.on('agent-event', ({ type, data }) => {
        if (data) {
          onEvent(data);
        }
      });
    }
  }

  /**
   * Check if currently connected to the server
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Register event listeners
   */
  public on(
    event: 'connect' | 'disconnect' | 'error' | 'reconnecting' | 'reconnectFailed',
    callback: any,
  ): void {
    switch (event) {
      case 'connect':
        this.listeners.onConnect.push(callback);
        break;
      case 'disconnect':
        this.listeners.onDisconnect.push(callback);
        break;
      case 'error':
        this.listeners.onError.push(callback);
        break;
      case 'reconnecting':
        this.listeners.onReconnecting.push(callback);
        break;
      case 'reconnectFailed':
        this.listeners.onReconnectFailed.push(callback);
        break;
    }
  }

  /**
   * Remove event listeners
   */
  public off(
    event: 'connect' | 'disconnect' | 'error' | 'reconnecting' | 'reconnectFailed',
    callback: any,
  ): void {
    switch (event) {
      case 'connect':
        this.listeners.onConnect = this.listeners.onConnect.filter((cb) => cb !== callback);
        break;
      case 'disconnect':
        this.listeners.onDisconnect = this.listeners.onDisconnect.filter((cb) => cb !== callback);
        break;
      case 'error':
        this.listeners.onError = this.listeners.onError.filter((cb) => cb !== callback);
        break;
      case 'reconnecting':
        this.listeners.onReconnecting = this.listeners.onReconnecting.filter(
          (cb) => cb !== callback,
        );
        break;
      case 'reconnectFailed':
        this.listeners.onReconnectFailed = this.listeners.onReconnectFailed.filter(
          (cb) => cb !== callback,
        );
        break;
    }
  }

  /**
   * Get the socket instance (if connected)
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Manually trigger a ping to check server connectivity
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
   * Handle successful connection
   */
  private handleConnect(): void {
    console.log('Connected to server');
    this.missedHeartbeats = 0;
    this.reconnectAttempts = 0;

    // Notify listeners
    this.listeners.onConnect.forEach((callback) => callback());
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    console.log('Disconnected from server:', reason);
    this.stopHeartbeat();

    // Notify listeners
    this.listeners.onDisconnect.forEach((callback) => callback(reason));
  }

  /**
   * Handle connection errors
   */
  private handleError(error: any): void {
    console.error('Socket error:', error);

    // Notify listeners
    this.listeners.onError.forEach((callback) => callback(error));
  }

  /**
   * Handle reconnection attempts
   */
  private handleReconnectAttempt(): void {
    this.reconnectAttempts++;
    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Notify listeners
    this.listeners.onReconnecting.forEach((callback) => callback());
  }

  /**
   * Handle failed reconnection
   */
  private handleReconnectFailed(): void {
    console.log('Failed to reconnect after multiple attempts');

    // Notify listeners
    this.listeners.onReconnectFailed.forEach((callback) => callback());
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.missedHeartbeats = 0;

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
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

      if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
        console.warn(`Missed ${this.missedHeartbeats} heartbeats, connection may be down`);
        // Force disconnect if we've missed too many heartbeats
        this.socket?.disconnect();
      }
      return;
    }

    this.socket.emit('ping', () => {
      this.missedHeartbeats = 0;
    });

    // Increment missed heartbeats counter - will be reset when we get a response
    this.missedHeartbeats++;

    if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
      console.warn(`Missed ${this.missedHeartbeats} heartbeats, connection may be down`);
      // Force disconnect if we've missed too many heartbeats
      this.socket.disconnect();
    }
  }
}
