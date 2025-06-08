/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from '@agent-tars/core';

/**
 * Session metadata interface
 */
export interface SessionMetadata {
  id: string;
  createdAt: number;
  updatedAt: number;
  name?: string;
  workingDirectory: string;
  tags?: string[];
}

/**
 * Storage configuration options
 */
export interface StorageOptions {
  /** Storage type: 'memory', 'file', 'sqlite', or 'database' */
  type: 'memory' | 'file' | 'sqlite' | 'database';
  /** File path for file-based storage or SQLite database */
  path?: string;
  /** Database connection configuration for database storage */
  database?: {
    url: string;
    name?: string;
    [key: string]: any;
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
  createSession(metadata: SessionMetadata): Promise<SessionMetadata>;

  /**
   * Update session metadata
   * @param sessionId Session ID
   * @param metadata Partial metadata to update
   */
  updateSessionMetadata(
    sessionId: string,
    metadata: Partial<Omit<SessionMetadata, 'id'>>,
  ): Promise<SessionMetadata>;

  /**
   * Get session metadata
   * @param sessionId Session ID
   */
  getSessionMetadata(sessionId: string): Promise<SessionMetadata | null>;

  /**
   * Get all sessions metadata
   */
  getAllSessions(): Promise<SessionMetadata[]>;

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
  saveEvent(sessionId: string, event: Event): Promise<void>;

  /**
   * Get all events for a session
   * @param sessionId Session ID
   */
  getSessionEvents(sessionId: string): Promise<Event[]>;

  /**
   * Close the storage provider
   */
  close(): Promise<void>;
}
