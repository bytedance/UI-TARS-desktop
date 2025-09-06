/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @tarko/agent-monitor - Comprehensive agent state monitoring solution
 * 
 * This package provides comprehensive monitoring capabilities for Tarko Agent execution:
 * 
 * 1. **WebSocket Monitoring (Primary)**: Real-time monitoring via AgentServer WebSocket
 * 2. **CLI Process Monitoring (Fallback)**: Process-based monitoring for silent mode
 * 3. **Unified Manager**: Automatic fallback and consistent API
 * 
 * @example WebSocket Monitoring
 * ```typescript
 * import { AgentStateMonitor } from '@tarko/agent-monitor';
 * 
 * const monitor = new AgentStateMonitor({
 *   serverUrl: 'http://localhost:8899'
 * });
 * 
 * await monitor.connect();
 * monitor.joinSession('session-id');
 * 
 * monitor.on({
 *   onStatusChange: (status) => console.log('Status:', status),
 *   onCompletion: (result) => console.log('Completed:', result)
 * });
 * ```
 * 
 * @example CLI Process Monitoring
 * ```typescript
 * import { CLIProcessMonitor } from '@tarko/agent-monitor';
 * 
 * const monitor = new CLIProcessMonitor({
 *   command: 'tarko-cli',
 *   args: ['run', 'query', '--mode=silent', '--monitor-format=json']
 * });
 * 
 * await monitor.start();
 * ```
 * 
 * @example Unified Monitoring with Fallback
 * ```typescript
 * import { AgentMonitorManager, createHybridMonitorConfig } from '@tarko/agent-monitor';
 * 
 * const config = createHybridMonitorConfig(
 *   'http://localhost:8899',
 *   'tarko-cli',
 *   ['run', 'query', '--mode=silent']
 * );
 * 
 * const manager = new AgentMonitorManager(config);
 * await manager.start();
 * ```
 */

// Core monitoring classes
export { AgentStateMonitor } from './AgentStateMonitor';
export type {
  AgentStateCallbacks,
  AgentMonitorOptions,
  ServerStatus
} from './AgentStateMonitor';

export { CLIProcessMonitor } from './CLIProcessMonitor';
export type {
  CLIMonitorEvents,
  CLIProcessStatus,
  CLIMonitorOptions
} from './CLIProcessMonitor';

export { AgentMonitorManager } from './AgentMonitorManager';
export type {
  MonitorConfig,
  UnifiedMonitorEvents,
  MonitorState
} from './AgentMonitorManager';
export { MonitorType } from './AgentMonitorManager';

// Utility functions
export {
  createWebSocketMonitorConfig,
  createCLIMonitorConfig,
  createHybridMonitorConfig,
  createSimpleMonitor,
  createCLIOnlyMonitor,
  waitForCompletion,
  normalizeAgentStatus,
  checkServerReachability,
  autoDetectMonitoringStrategy,
  formatDuration,
  createStatusLogger
} from './utils';

// Type definitions for agent monitoring (copied from @tarko/interface)
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
