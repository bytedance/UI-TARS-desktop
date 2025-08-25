/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { io, Socket } from 'socket.io-client';

// Type definitions for agent monitoring
export interface AgentStatusInfo {
  isProcessing: boolean;
  state?: string;
  phase?: string;
  message?: string;
  estimatedTime?: string;
}

export namespace AgentEventStream {
  export interface Event {
    type: string;
    data: any;
    timestamp?: string;
  }
}

// Simple logger implementation
function getLogger(name: string) {
  return {
    info: (message: string, ...args: any[]) => console.log(`[${name}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[${name}] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[${name}] ${message}`, ...args),
    debug: (message: string, ...args: any[]) => console.debug(`[${name}] ${message}`, ...args),
  };
}

/**
 * Event callback types for agent state monitoring
 */
export interface AgentStateCallbacks {
  onStatusChange?: (status: AgentStatusInfo) => void;
  onEvent?: (event: AgentEventStream.Event) => void;
  onCompletion?: (result: any) => void;
  onError?: (error: Error) => void;
  onAborted?: () => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

/**
 * Connection options for AgentStateMonitor
 */
export interface AgentMonitorOptions {
  /** Server URL to connect to */
  serverUrl: string;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Auto-reconnect on connection loss */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
}

/**
 * Server status information
 */
export interface ServerStatus {
  isExclusive: boolean;
  runningSessionId: string | null;
  canAcceptNewRequest: boolean;
}

/**
 * Comprehensive agent state monitoring solution
 * 
 * Provides real-time monitoring of Tarko Agent execution state via WebSocket connection.
 * This is the primary recommended approach for monitoring agent state as it leverages
 * the existing AgentServer WebSocket infrastructure.
 */
export class AgentStateMonitor {
  private socket: Socket | null = null;
  private logger = getLogger('AgentStateMonitor');
  private callbacks: AgentStateCallbacks = {};
  private isConnected = false;
  private currentSessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private autoReconnect: boolean;

  constructor(private options: AgentMonitorOptions) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectDelay = options.reconnectDelay ?? 1000;
    this.autoReconnect = options.autoReconnect ?? true;
  }

  /**
   * Connect to the AgentServer WebSocket
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      this.logger.warn('Already connected to agent server');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.options.serverUrl, {
          timeout: this.options.timeout ?? 5000,
          transports: ['websocket', 'polling'],
        });

        this.setupEventHandlers();

        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.logger.info(`Connected to agent server: ${this.options.serverUrl}`);
          this.callbacks.onConnected?.();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          this.logger.error(`Connection error: ${error.message}`);
          if (!this.isConnected) {
            reject(new Error(`Failed to connect: ${error.message}`));
          }
        });

        this.socket.on('disconnect', (reason) => {
          this.isConnected = false;
          this.logger.warn(`Disconnected from agent server: ${reason}`);
          this.callbacks.onDisconnected?.();

          if (this.autoReconnect && reason !== 'io client disconnect') {
            this.attemptReconnect();
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup event handlers for agent monitoring
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Agent status updates
    this.socket.on('agent-status', (status: AgentStatusInfo) => {
      this.logger.debug('Agent status update:', status);
      this.callbacks.onStatusChange?.(status);
    });

    // Agent events
    this.socket.on('agent-event', (data: { type: string; data: any }) => {
      this.logger.debug('Agent event:', data);
      this.callbacks.onEvent?.(data.data);

      // Handle completion events
      if (data.type === 'completion' || data.type === 'final_answer') {
        this.callbacks.onCompletion?.(data.data);
      }
    });

    // Error events
    this.socket.on('error', (error: any) => {
      const errorObj = typeof error === 'string' ? new Error(error) : error;
      this.logger.error('Agent error:', errorObj);
      this.callbacks.onError?.(errorObj);
    });

    // Abort events
    this.socket.on('aborted', () => {
      this.logger.info('Agent execution aborted');
      this.callbacks.onAborted?.();
    });

    // Session ready
    this.socket.on('ready', (data: { sessionId: string }) => {
      this.logger.info(`Session ready: ${data.sessionId}`);
    });

    // Session closed
    this.socket.on('closed', (data: { sessionId: string }) => {
      this.logger.info(`Session closed: ${data.sessionId}`);
      if (this.currentSessionId === data.sessionId) {
        this.currentSessionId = null;
      }
    });
  }

  /**
   * Join a specific agent session for monitoring
   */
  joinSession(sessionId: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to agent server');
    }

    this.currentSessionId = sessionId;
    this.socket.emit('join-session', sessionId);
    this.logger.info(`Joined session: ${sessionId}`);
  }

  /**
   * Get server status information
   */
  async getServerStatus(): Promise<ServerStatus> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to agent server');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for server status'));
      }, 5000);

      this.socket!.once('server-status', (status: ServerStatus) => {
        clearTimeout(timeout);
        resolve(status);
      });

      this.socket!.emit('get-server-status');
    });
  }

  /**
   * Send a query to the current session
   */
  sendQuery(query: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to agent server');
    }

    if (!this.currentSessionId) {
      throw new Error('No session joined');
    }

    this.socket.emit('send-query', {
      sessionId: this.currentSessionId,
      query,
    });
  }

  /**
   * Abort the current query in the session
   */
  abortQuery(): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to agent server');
    }

    if (!this.currentSessionId) {
      throw new Error('No session joined');
    }

    this.socket.emit('abort-query', {
      sessionId: this.currentSessionId,
    });
  }

  /**
   * Register event callbacks
   */
  on(callbacks: AgentStateCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Remove specific callback
   */
  off(callbackType: keyof AgentStateCallbacks): void {
    delete this.callbacks[callbackType];
  }

  /**
   * Attempt to reconnect to the server
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      await this.connect();
      
      // Rejoin session if we were in one
      if (this.currentSessionId) {
        this.joinSession(this.currentSessionId);
      }
    } catch (error) {
      this.logger.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from the agent server
   */
  disconnect(): void {
    if (this.socket) {
      this.autoReconnect = false;
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentSessionId = null;
    this.logger.info('Disconnected from agent server');
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    currentSessionId: string | null;
    serverUrl: string;
  } {
    return {
      isConnected: this.isConnected,
      currentSessionId: this.currentSessionId,
      serverUrl: this.options.serverUrl,
    };
  }

  /**
   * Ping the server to check connectivity
   */
  async ping(): Promise<boolean> {
    if (!this.isConnected || !this.socket) {
      return false;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 3000);
      
      this.socket!.emit('ping', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }
}
