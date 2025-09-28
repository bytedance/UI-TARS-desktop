/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionInfo } from '@tarko/interface';

/**
 * Session Data Access Object interface
 * Provides abstraction for session data operations
 */
export interface ISessionDAO {
  /**
   * Create a new session with metadata
   */
  createSession(metadata: SessionInfo): Promise<SessionInfo>;

  /**
   * Update session metadata
   */
  updateSessionInfo(
    sessionId: string,
    sessionInfo: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo>;

  /**
   * Get session metadata
   */
  getSessionInfo(sessionId: string): Promise<SessionInfo | null>;

  /**
   * Get all sessions metadata
   */
  getAllSessions(): Promise<SessionInfo[]>;

  /**
   * Get all sessions for a specific user (multi-tenant)
   */
  getUserSessions(userId: string): Promise<SessionInfo[]>;

  /**
   * Delete a session (without events - events are handled by IEventDAO)
   */
  deleteSession(sessionId: string): Promise<boolean>;

  /**
   * Check if session exists
   */
  sessionExists(sessionId: string): Promise<boolean>;

  /**
   * Update session's last accessed timestamp
   */
  updateSessionTimestamp(sessionId: string): Promise<void>;
}