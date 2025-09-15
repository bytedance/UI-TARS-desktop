/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, SessionInfo } from '@tarko/interface';
import { IDAOFactory } from '../dao/interfaces/IDAOFactory';

/**
 * Extended SessionInfo for multi-tenant support
 */
export interface ExtendedSessionInfo extends SessionInfo {
  userId?: string;
  metadata?: SessionInfo['metadata'] & {
    sandboxUrl?: string;
    user?: {
      userId: string;
      email: string;
      name?: string;
    };
  };
}

/**
 * Abstract storage provider interface
 * Provides methods for storing and retrieving session data
 */
export interface StorageProvider {
  /**
   * DB path.
   */
  dbPath?: string;

  /**
   * Initialize the storage provider
   */
  initialize(): Promise<void>;

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

  /**
   * Close the storage provider
   */
  close(): Promise<void>;

  /**
   * Get the DAO factory for direct DAO access
   * This is the preferred way to access data operations
   */
  getDAOFactory(): IDAOFactory;
}
