/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, SessionItemInfo } from '@tarko/interface';

export type { SessionItemInfo, LegacySessionItemInfo } from '@tarko/interface';

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
  createSession(metadata: SessionItemInfo): Promise<SessionItemInfo>;

  /**
   * Update session metadata
   * @param sessionId Session ID
   * @param sessionItemInfo Partial session item info data to update
   */
  updateSessionItemInfo(
    sessionId: string,
    sessionItemInfo: Partial<Omit<SessionItemInfo, 'id'>>,
  ): Promise<SessionItemInfo>;

  /**
   * Get session metadata
   * @param sessionId Session ID
   */
  getSessionItemInfo(sessionId: string): Promise<SessionItemInfo | null>;

  /**
   * Get all sessions metadata
   */
  getAllSessions(): Promise<SessionItemInfo[]>;

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
}
