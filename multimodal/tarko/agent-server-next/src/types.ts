/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Context } from 'hono';
import type {
  AgentAppConfig,
  AgentServerVersionInfo,
  AgentResolutionResult,
  AgioProviderConstructor,
  IAgent,
  GlobalDirectoryOptions,
  TenantConfig,
} from '@tarko/interface';
import type { StorageProvider } from './storage';
import type { AgentSession, AgentSessionFactory, AgentSessionPool } from './core/session/index';
import type { UserConfigService } from './services/UserConfigService';

/**
 * AgentServer initialization options
 */
export interface AgentServerInitOptions<T extends AgentAppConfig = AgentAppConfig> {
  appConfig: T;
  versionInfo?: AgentServerVersionInfo;
  directories?: GlobalDirectoryOptions;
}

/**
 * Hono context with AgentServer extensions
 */
export interface AgentServerContext extends Context {
  get(key: 'server'): AgentServer;
  get(key: 'session'): AgentSession;
  set(key: 'server', value: AgentServer): void;
  set(key: 'session', value: AgentSession): void;
}

export interface UserInfo {
  userId: string;
  email: string;
  name?: string;
  organization?: string;
  [key: string]: any;
}

/**
 * Variables that can be stored in Hono context
 */
export interface ContextVariables {
  server: AgentServer;
  session?: AgentSession;
  requestId?: string;
  startTime?: number;
  user?: UserInfo;
}

/**
 * Extended Hono context with proper typing
 */
export type HonoContext = Context<{ Variables: ContextVariables }>;

/**
 * AgentServer class interface - forward declaration to avoid circular imports
 */
export interface AgentServer<T extends AgentAppConfig = AgentAppConfig> {
  // Core server components
  readonly port: number;
  readonly isDebug: boolean;
  readonly isExclusive: boolean;
  readonly storageProvider: StorageProvider;
  readonly appConfig: T;
  readonly versionInfo?: AgentServerVersionInfo;
  readonly directories: Required<GlobalDirectoryOptions>;
  readonly tenantConfig: TenantConfig;

  // Session management
  storageUnsubscribes: Record<string, () => void>;
  userConfigService?: UserConfigService;

  // New session management methods
  getSessionPool(): AgentSessionPool;
  getSessionFactory(): AgentSessionFactory;
  isMultiTenant(): boolean;
  getMemoryStats(): any;

  // Server lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  isServerRunning(): boolean;

  // Agent and workspace methods
  getCurrentWorkspace(): string;
  getCurrentAgentName(): string | undefined;
  createAgent(): IAgent;
  createAgentWithSessionModel(sessionInfo?: any): IAgent;

  // Model configuration
  getAvailableModels(): Array<{ name: string; models: string[]; baseURL?: string }>;
  isModelConfigValid(provider: string, modelId: string): boolean;
  getDefaultModelConfig(): { provider: string; modelId: string };

  // Exclusive mode management
  canAcceptNewRequest(): boolean;
  setRunningSession(sessionId: string): void;
  clearRunningSession(sessionId: string): void;
  getRunningSessionId(): string | null;

  // Custom providers
  getCustomAgioProvider(): AgioProviderConstructor | undefined;
  getAgentConstructorWebConfig(): Record<string, any> | undefined;

  // Storage information
  getStorageInfo(): { type: string; path?: string };
}

// Re-export types from interface
export type {
  AgentAppConfig,
  AgentServerVersionInfo,
  AgentResolutionResult,
  AgioProviderConstructor,
  IAgent,
  GlobalDirectoryOptions,
};
