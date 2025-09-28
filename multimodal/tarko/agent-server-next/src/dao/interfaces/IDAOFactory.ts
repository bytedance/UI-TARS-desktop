/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, SessionInfo } from '@tarko/interface';
import { IUserConfigDAO } from './IUserConfigDAO';
import { ISessionDAO } from './ISessionDAO';
import { IEventDAO } from './IEventDAO';
import { ISandboxAllocationDAO } from './ISandboxAllocationDAO';


/**
 * DAO Factory interface
 * Provides abstraction for creating and managing DAO instances
 * Supports different storage backends (MongoDB, SQLite, etc.)
 * 
 * Now includes StorageProvider functionality for unified data access
 */
export interface IDAOFactory {
  /**
   * DB path (for SQLite backends)
   */
  dbPath?: string;

  /**
   * Initialize the DAO factory and underlying connections
   */
  initialize(): Promise<void>;

  /**
   * Check if the DAO factory is initialized
   */
  isInitialized(): boolean;

  /**
   * Close all connections and cleanup resources
   */
  close(): Promise<void>;

  // DAO factory methods
  getUserConfigDAO(): IUserConfigDAO;
  getSessionDAO(): ISessionDAO;
  getEventDAO(): IEventDAO;
  getSandboxAllocationDAO(): ISandboxAllocationDAO;
  healthCheck(): Promise<{ healthy: boolean; message?: string; [key: string]: any }>;

  // StorageProvider methods - high-level data operations
  /**
   * Create a new session with metadata
   * @param metadata Session metadata
   */
  createSession(metadata: SessionInfo): Promise<SessionInfo>;

  /**
   * Update session metadata
   * @param sessionId Session ID
   * @param sessionInfo Partial session info data to update
   */
  updateSessionInfo(
    sessionId: string,
    sessionInfo: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo>;

  /**
   * Get session metadata
   * @param sessionId Session ID
   */
  getSessionInfo(sessionId: string): Promise<SessionInfo | null>;

  /**
   * Get all sessions metadata
   */
  getAllSessions(): Promise<SessionInfo[]>;

  /**
   * Get all sessions for a specific user (multi-tenant)
   * @param userId User ID
   */
  getUserSessions(userId: string): Promise<SessionInfo[]>;

  /**
   * Delete a session and all its events
   * @param sessionId Session ID
   */
  deleteSession(sessionId: string): Promise<boolean>;

  /**
   * Save an event to a session
   * @param sessionId Session ID
   * @param event Event to save
   */
  saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void>;

  /**
   * Get all events for a session
   * @param sessionId Session ID
   */
  getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]>;
}

/**
 * Storage backend type for DAO factory configuration
 */
export type StorageBackend = 'mongodb' | 'sqlite';

/**
 * DAO Factory configuration interface
 */
export interface DAOFactoryConfig {
  backend: StorageBackend;
  connectionConfig: any; // Storage-specific connection configuration
}