/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentMonitorManager, MonitorConfig, MonitorType } from './AgentMonitorManager';
import { AgentMonitorOptions } from './AgentStateMonitor';
import { CLIMonitorOptions } from './CLIProcessMonitor';

/**
 * Utility functions for agent monitoring
 */

/**
 * Create a WebSocket monitor configuration
 */
export function createWebSocketMonitorConfig(
  serverUrl: string,
  options?: Partial<AgentMonitorOptions>
): MonitorConfig {
  return {
    type: MonitorType.WEBSOCKET,
    websocket: {
      serverUrl,
      timeout: 5000,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      ...options
    }
  };
}

/**
 * Create a CLI process monitor configuration
 */
export function createCLIMonitorConfig(
  command: string,
  args: string[],
  options?: Partial<CLIMonitorOptions>
): MonitorConfig {
  return {
    type: MonitorType.CLI_PROCESS,
    cliProcess: {
      command,
      args,
      parseJsonOutput: true,
      timeout: 300000, // 5 minutes default
      ...options
    }
  };
}

/**
 * Create a hybrid monitor configuration with WebSocket primary and CLI fallback
 */
export function createHybridMonitorConfig(
  websocketUrl: string,
  fallbackCommand: string,
  fallbackArgs: string[],
  options?: {
    websocket?: Partial<AgentMonitorOptions>;
    cli?: Partial<CLIMonitorOptions>;
  }
): MonitorConfig {
  return {
    type: MonitorType.WEBSOCKET,
    websocket: {
      serverUrl: websocketUrl,
      timeout: 5000,
      autoReconnect: true,
      maxReconnectAttempts: 3, // Fewer attempts for hybrid mode
      reconnectDelay: 1000,
      ...options?.websocket
    },
    enableFallback: true,
    fallbackCLI: {
      command: fallbackCommand,
      args: fallbackArgs,
      parseJsonOutput: true,
      timeout: 300000,
      ...options?.cli
    }
  };
}

/**
 * Create a simple monitor for one-shot agent execution
 */
export async function createSimpleMonitor(
  serverUrl: string,
  sessionId?: string
): Promise<AgentMonitorManager> {
  const config = createWebSocketMonitorConfig(serverUrl);
  const monitor = new AgentMonitorManager(config);
  
  await monitor.start();
  
  if (sessionId) {
    monitor.joinSession(sessionId);
  }
  
  return monitor;
}

/**
 * Create a CLI-only monitor for silent mode execution
 */
export async function createCLIOnlyMonitor(
  command: string,
  args: string[],
  options?: Partial<CLIMonitorOptions>
): Promise<AgentMonitorManager> {
  const config = createCLIMonitorConfig(command, args, options);
  const monitor = new AgentMonitorManager(config);
  
  await monitor.start();
  
  return monitor;
}

/**
 * Wait for monitor to complete with timeout
 */
export function waitForCompletion(
  monitor: AgentMonitorManager,
  timeoutMs: number = 300000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Monitor operation timed out'));
    }, timeoutMs);

    monitor.on({
      onCompletion: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      onError: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
      onAborted: () => {
        clearTimeout(timeout);
        reject(new Error('Monitor operation was aborted'));
      }
    });
  });
}

/**
 * Extract agent execution status from various status formats
 */
export function normalizeAgentStatus(status: any): {
  isExecuting: boolean;
  state: string;
  phase?: string;
  message?: string;
} {
  // Handle WebSocket status format
  if (typeof status === 'object' && 'isProcessing' in status) {
    return {
      isExecuting: status.isProcessing,
      state: status.state || 'unknown',
      phase: status.phase,
      message: status.message
    };
  }
  
  // Handle CLI status format
  if (typeof status === 'object' && 'state' in status) {
    return {
      isExecuting: status.state === 'executing',
      state: status.state,
      message: `Process ${status.state}${status.pid ? ` (PID: ${status.pid})` : ''}`
    };
  }
  
  // Fallback for unknown formats
  return {
    isExecuting: false,
    state: 'unknown',
    message: 'Unknown status format'
  };
}

/**
 * Check if a server URL is reachable
 */
export async function checkServerReachability(serverUrl: string): Promise<boolean> {
  try {
    const url = new URL(serverUrl);
    const response = await fetch(`${url.protocol}//${url.host}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Auto-detect the best monitoring strategy
 */
export async function autoDetectMonitoringStrategy(
  serverUrl: string,
  fallbackCommand?: string,
  fallbackArgs?: string[]
): Promise<MonitorConfig> {
  const isServerReachable = await checkServerReachability(serverUrl);
  
  if (isServerReachable) {
    return createWebSocketMonitorConfig(serverUrl);
  } else if (fallbackCommand && fallbackArgs) {
    return createCLIMonitorConfig(fallbackCommand, fallbackArgs);
  } else {
    throw new Error('Server is not reachable and no CLI fallback provided');
  }
}

/**
 * Format duration for display
 */
export function formatDuration(startTime: Date, endTime?: Date): string {
  const end = endTime || new Date();
  const durationMs = end.getTime() - startTime.getTime();
  
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Create a simple status logger
 */
export function createStatusLogger(prefix: string = '[Monitor]') {
  return {
    logStatus: (status: any) => {
      const normalized = normalizeAgentStatus(status);
      console.log(`${prefix} Status: ${normalized.state} - ${normalized.message || 'No message'}`);
    },
    logCompletion: (result: any, duration?: string) => {
      console.log(`${prefix} Completed${duration ? ` in ${duration}` : ''}: ${JSON.stringify(result, null, 2)}`);
    },
    logError: (error: Error) => {
      console.error(`${prefix} Error: ${error.message}`);
    },
    logConnection: (connected: boolean, type?: string) => {
      console.log(`${prefix} ${connected ? 'Connected' : 'Disconnected'}${type ? ` (${type})` : ''}`);
    }
  };
}
