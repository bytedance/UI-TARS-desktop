/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Context, MiddlewareHandler } from 'hono';
import type { ContextVariables } from '../types';

/**
 * Hook execution context - same as Hono's context
 */
export type HookContext = Context<{ Variables: ContextVariables }>;

/**
 * Hook handler function type
 */
export type HookHandler = MiddlewareHandler<{ Variables: ContextVariables }>;

/**
 * Hook definition interface
 */
export interface Hook {
  /** Unique identifier for the hook */
  id: string;
  /** Display name for the hook */
  name: string;
  /** Hook handler function */
  handler: HookHandler;
  /** Priority (higher number = earlier execution) */
  priority: number;
  /** Optional description */
  description?: string;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Built-in middleware priorities
 * Higher number = earlier execution
 */
export enum BuiltInPriorities {
  /** CORS middleware - must be first to handle preflight requests */
  CORS = 1000,
  
  /** Server injection middleware - early setup */
  SERVER_INJECTION = 900,
  
  /** Error handling middleware - catch all errors */
  ERROR_HANDLING = 800,

  /** Context Storage middleware - transfer info through the whole request */
  CONTEXT_STORAGE = 850,
  
  /** Request ID middleware - for request tracking */
  REQUEST_ID = 700,
  
  /** Access logging middleware - after request ID */
  ACCESS_LOG = 600,
  
  /** Authentication middleware - after logging */
  AUTH = 500,
  
  /** Session restore middleware - after auth */
  SESSION_RESTORE = 400,
  
  /** Exclusive mode middleware - business logic */
  EXCLUSIVE_MODE = 300,
  
  /** Custom middleware default priority */
  CUSTOM_DEFAULT = 200,
  
  /** Route handlers - lowest priority */
  ROUTES = 100,
}

/**
 * Hook registration options
 */
export interface HookRegistrationOptions {
  /** Hook identifier */
  id: string;
  /** Display name */
  name: string;
  /** Hook handler */
  handler: HookHandler;
  /** Priority (default: BuiltInPriorities.CUSTOM_DEFAULT) */
  priority?: number;
  /** Description */
  description?: string;
  /** Metadata */
  metadata?: Record<string, any>;
  /** Whether to replace existing hook with same id */
  replace?: boolean;
}

/**
 * Hook execution phase
 */
export enum HookPhase {
  /** Before request processing */
  PRE_REQUEST = 'pre_request',
  /** During request processing */
  REQUEST = 'request',
  /** After request processing */
  POST_REQUEST = 'post_request',
}

/**
 * Hook manager interface
 */
export interface IHookManager {
  /** Register a new hook */
  register(options: HookRegistrationOptions): void;
  
  /** Unregister a hook by id */
  unregister(id: string): boolean;
  
  /** Get all hooks sorted by priority */
  getHooks(): Hook[];
  
  /** Get hook by id */
  getHook(id: string): Hook | undefined;
  
  /** Check if hook exists */
  hasHook(id: string): boolean;
  
  /** Clear all hooks */
  clear(): void;
  
  /** Get hooks count */
  count(): number;
}

/**
 * Hook event data
 */
export interface HookEvent {
  /** Event type */
  type: 'register' | 'unregister' | 'execute';
  /** Hook id */
  hookId: string;
  /** Timestamp */
  timestamp: Date;
  /** Additional data */
  data?: any;
}

/**
 * Hook execution stats
 */
export interface HookStats {
  /** Hook id */
  id: string;
  /** Execution count */
  executions: number;
  /** Total execution time in ms */
  totalTime: number;
  /** Average execution time in ms */
  avgTime: number;
  /** Last execution time */
  lastExecution?: Date;
  /** Error count */
  errors: number;
}