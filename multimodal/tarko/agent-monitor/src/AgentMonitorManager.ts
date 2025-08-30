/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentStateMonitor, AgentMonitorOptions } from './AgentStateMonitor';
import { CLIProcessMonitor, CLIMonitorOptions } from './CLIProcessMonitor';

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
 * Monitor type enumeration
 */
export enum MonitorType {
  WEBSOCKET = 'websocket',
  CLI_PROCESS = 'cli_process'
}

/**
 * Unified monitoring configuration
 */
export interface MonitorConfig {
  /** Primary monitor type */
  type: MonitorType;
  /** WebSocket monitor options (for WEBSOCKET type) */
  websocket?: AgentMonitorOptions;
  /** CLI process monitor options (for CLI_PROCESS type) */
  cliProcess?: CLIMonitorOptions;
  /** Enable automatic fallback to CLI monitoring if WebSocket fails */
  enableFallback?: boolean;
  /** Fallback CLI options */
  fallbackCLI?: CLIMonitorOptions;
}

/**
 * Unified event callbacks for both monitor types
 */
export interface UnifiedMonitorEvents {
  onStatusChange?: (status: any) => void;
  onCompletion?: (result: any) => void;
  onError?: (error: Error) => void;
  onAborted?: () => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onOutput?: (output: string, type: 'stdout' | 'stderr') => void;
}

/**
 * Current monitor state
 */
export interface MonitorState {
  activeType: MonitorType | null;
  isConnected: boolean;
  isRunning: boolean;
  lastError: Error | null;
  startTime: Date | null;
  sessionId: string | null;
}

/**
 * Agent Monitor Manager - Unified interface for agent state monitoring
 * 
 * Provides a single interface that can use either:
 * 1. WebSocket connection to AgentServer (primary, recommended)
 * 2. CLI process monitoring (fallback for silent mode)
 * 
 * Automatically handles fallback scenarios and provides consistent API.
 */
export class AgentMonitorManager {
  private logger = getLogger('AgentMonitorManager');
  private websocketMonitor: AgentStateMonitor | null = null;
  private cliMonitor: CLIProcessMonitor | null = null;
  private config: MonitorConfig;
  private events: UnifiedMonitorEvents = {};
  private state: MonitorState = {
    activeType: null,
    isConnected: false,
    isRunning: false,
    lastError: null,
    startTime: null,
    sessionId: null
  };

  constructor(config: MonitorConfig) {
    this.config = config;
  }

  /**
   * Initialize and start monitoring based on configuration
   */
  async start(): Promise<void> {
    this.updateState({ startTime: new Date(), lastError: null });

    try {
      if (this.config.type === MonitorType.WEBSOCKET) {
        await this.startWebSocketMonitoring();
      } else if (this.config.type === MonitorType.CLI_PROCESS) {
        await this.startCLIMonitoring();
      } else {
        throw new Error(`Unsupported monitor type: ${this.config.type}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateState({ lastError: err });
      
      // Try fallback if enabled
      if (this.config.enableFallback && this.config.fallbackCLI) {
        this.logger.warn('Primary monitoring failed, attempting CLI fallback:', err.message);
        await this.startCLIFallback();
      } else {
        throw err;
      }
    }
  }

  /**
   * Start WebSocket monitoring
   */
  private async startWebSocketMonitoring(): Promise<void> {
    if (!this.config.websocket) {
      throw new Error('WebSocket configuration is required for WEBSOCKET monitor type');
    }

    this.websocketMonitor = new AgentStateMonitor(this.config.websocket);

    // Setup event forwarding
    this.websocketMonitor.on({
      onStatusChange: (status) => {
        this.updateState({ isRunning: status.isProcessing });
        this.events.onStatusChange?.(status);
      },
      onCompletion: (result) => {
        this.updateState({ isRunning: false });
        this.events.onCompletion?.(result);
      },
      onError: (error) => {
        this.updateState({ lastError: error });
        this.events.onError?.(error);
      },
      onAborted: () => {
        this.updateState({ isRunning: false });
        this.events.onAborted?.();
      },
      onConnected: () => {
        this.updateState({ isConnected: true, activeType: MonitorType.WEBSOCKET });
        this.events.onConnected?.();
      },
      onDisconnected: () => {
        this.updateState({ isConnected: false });
        this.events.onDisconnected?.();
      }
    });

    await this.websocketMonitor.connect();
    this.logger.info('WebSocket monitoring started successfully');
  }

  /**
   * Start CLI process monitoring
   */
  private async startCLIMonitoring(): Promise<void> {
    if (!this.config.cliProcess) {
      throw new Error('CLI process configuration is required for CLI_PROCESS monitor type');
    }

    this.cliMonitor = new CLIProcessMonitor(this.config.cliProcess);

    // Setup event forwarding
    this.cliMonitor.on({
      onStatusChange: (status) => {
        const isRunning = status.state === 'executing';
        this.updateState({ 
          isRunning,
          isConnected: true, // CLI is "connected" when process is running
          activeType: MonitorType.CLI_PROCESS 
        });
        this.events.onStatusChange?.(status);
      },
      onOutput: (output, type) => {
        this.events.onOutput?.(output, type);
      },
      onCompletion: (result) => {
        this.updateState({ isRunning: false, isConnected: false });
        this.events.onCompletion?.(result);
      },
      onError: (error) => {
        this.updateState({ lastError: error, isRunning: false, isConnected: false });
        this.events.onError?.(error);
      },
      onAborted: () => {
        this.updateState({ isRunning: false, isConnected: false });
        this.events.onAborted?.();
      }
    });

    await this.cliMonitor.start();
    this.logger.info('CLI process monitoring started successfully');
  }

  /**
   * Start CLI fallback monitoring
   */
  private async startCLIFallback(): Promise<void> {
    if (!this.config.fallbackCLI) {
      throw new Error('Fallback CLI configuration is not available');
    }

    // Clean up failed primary monitor
    this.cleanup();

    this.cliMonitor = new CLIProcessMonitor(this.config.fallbackCLI);

    // Setup event forwarding (same as CLI monitoring)
    this.cliMonitor.on({
      onStatusChange: (status) => {
        const isRunning = status.state === 'executing';
        this.updateState({ 
          isRunning,
          isConnected: true,
          activeType: MonitorType.CLI_PROCESS 
        });
        this.events.onStatusChange?.(status);
      },
      onOutput: (output, type) => {
        this.events.onOutput?.(output, type);
      },
      onCompletion: (result) => {
        this.updateState({ isRunning: false, isConnected: false });
        this.events.onCompletion?.(result);
      },
      onError: (error) => {
        this.updateState({ lastError: error, isRunning: false, isConnected: false });
        this.events.onError?.(error);
      },
      onAborted: () => {
        this.updateState({ isRunning: false, isConnected: false });
        this.events.onAborted?.();
      }
    });

    await this.cliMonitor.start();
    this.logger.info('CLI fallback monitoring started successfully');
  }

  /**
   * Join a session (WebSocket only)
   */
  joinSession(sessionId: string): void {
    if (this.websocketMonitor && this.state.activeType === MonitorType.WEBSOCKET) {
      this.websocketMonitor.joinSession(sessionId);
      this.updateState({ sessionId });
    } else {
      throw new Error('Session joining is only available for WebSocket monitoring');
    }
  }

  /**
   * Send a query
   */
  sendQuery(query: string): void {
    if (this.websocketMonitor && this.state.activeType === MonitorType.WEBSOCKET) {
      this.websocketMonitor.sendQuery(query);
    } else if (this.cliMonitor && this.state.activeType === MonitorType.CLI_PROCESS) {
      this.cliMonitor.sendInput(query);
    } else {
      throw new Error('No active monitor available for sending queries');
    }
  }

  /**
   * Abort current operation
   */
  abort(): boolean {
    if (this.websocketMonitor && this.state.activeType === MonitorType.WEBSOCKET) {
      this.websocketMonitor.abortQuery();
      return true;
    } else if (this.cliMonitor && this.state.activeType === MonitorType.CLI_PROCESS) {
      return this.cliMonitor.abort();
    }
    return false;
  }

  /**
   * Get server status (WebSocket only)
   */
  async getServerStatus(): Promise<any> {
    if (this.websocketMonitor && this.state.activeType === MonitorType.WEBSOCKET) {
      return await this.websocketMonitor.getServerStatus();
    } else {
      throw new Error('Server status is only available for WebSocket monitoring');
    }
  }

  /**
   * Get current monitor state
   */
  getState(): MonitorState {
    return { ...this.state };
  }

  /**
   * Register event callbacks
   */
  on(events: UnifiedMonitorEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * Remove specific event callback
   */
  off(eventType: keyof UnifiedMonitorEvents): void {
    delete this.events[eventType];
  }

  /**
   * Update internal state
   */
  private updateState(updates: Partial<MonitorState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Ping the active monitor
   */
  async ping(): Promise<boolean> {
    if (this.websocketMonitor && this.state.activeType === MonitorType.WEBSOCKET) {
      return await this.websocketMonitor.ping();
    } else if (this.cliMonitor && this.state.activeType === MonitorType.CLI_PROCESS) {
      return this.cliMonitor.isRunning();
    }
    return false;
  }

  /**
   * Get output (CLI only)
   */
  getOutput(): { stdout: string[]; stderr: string[] } | null {
    if (this.cliMonitor && this.state.activeType === MonitorType.CLI_PROCESS) {
      return this.cliMonitor.getOutput();
    }
    return null;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.websocketMonitor) {
      this.websocketMonitor.disconnect();
      this.websocketMonitor = null;
    }

    if (this.cliMonitor) {
      this.cliMonitor.cleanup();
      this.cliMonitor = null;
    }

    // Cleanup completed
    this.updateState({
      activeType: null,
      isConnected: false,
      isRunning: false,
      sessionId: null
    });

    this.logger.info('Monitor manager cleaned up');
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    this.cleanup();
  }
}
