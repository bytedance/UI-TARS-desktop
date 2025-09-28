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
import type { IDAOFactory } from './dao';
import type { AgentSession, AgentSessionFactory, AgentSessionPool } from './services/session';
import type { UserConfigService } from './services/user';
import { HookRegistrationOptions } from './hooks/types';

/**
 * Logger interface constraint that defines the required methods
 * for any logger implementation
 */
export interface ILogger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  spawn?(module: string): ILogger;
  setLevel?(level: any): void;
}
/**
 * AgentServer initialization options
 */
export interface AgentServerInitOptions<T extends AgentAppConfig> {
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
  user?: UserInfo;
  server: AgentServer;
  session?: AgentSession;
  requestId?: string;
  [key: string]: any;
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
  readonly daoFactory: IDAOFactory;
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

  // Exclusive mode management
  canAcceptNewRequest(): boolean;
  setRunningSession(sessionId: string): void;
  clearRunningSession(sessionId: string): void;
  getRunningSessionId(): string | null;

  getCurrentAgentResolution(): AgentResolutionResult | undefined

  // Custom providers
  getCustomAgioProvider(): AgioProviderConstructor | undefined;
  getAgentConstructorWebConfig(): Record<string, any> | undefined;

  // Storage information
  getStorageInfo(): { type: string; path?: string };

  //hook system
  registerHook(options: HookRegistrationOptions): void
  unregisterHook(id: string): boolean

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

// Hook system types
export * from './hooks/types';
