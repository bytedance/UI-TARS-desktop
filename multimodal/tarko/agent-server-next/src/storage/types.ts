/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/interface';

/**
 * Session metadata interface
 */
export interface SessionMetadata {
  version?: number;
  name?: string;
  tags?: string[];
  modelConfig?: {
    provider: string;
    modelId: string;
  };
  [key: string]: any; // Allow additional metadata fields
}

/**
 * Session information interface
 */
export interface SessionInfo {
  id: string;
  createdAt: number;
  updatedAt: number;
  workspace?: string;
  modelProvider?: string;
  modelId?: string;
  metadata?: SessionMetadata;
}

/**
 * Legacy session item info for backward compatibility
 */
export interface LegacySessionItemInfo {
  id: string;
  createdAt: number;
  updatedAt: number;
  name?: string;
  workspace?: string;
  workingDirectory?: string;
  tags?: string[];
  modelConfig?: {
    provider: string;
    modelId: string;
  };
}

/**
 * Storage provider interface
 */
export interface StorageProvider {
  /**
   * Initialize the storage provider
   */
  initialize(): Promise<void>;

  /**
   * Create a new session
   */
  createSession(metadata: SessionInfo): Promise<SessionInfo>;

  /**
   * Update session information
   */
  updateSessionInfo(
    sessionId: string,
    sessionInfo: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo>;

  /**
   * Get session information by ID
   */
  getSessionInfo(sessionId: string): Promise<SessionInfo | null>;

  /**
   * Get all sessions
   */
  getAllSessions(): Promise<SessionInfo[]>;

  /**
   * Delete a session and all its events
   */
  deleteSession(sessionId: string): Promise<boolean>;

  /**
   * Save an event for a session
   */
  saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void>;

  /**
   * Get all events for a session
   */
  getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]>;

  /**
   * Health check for storage provider
   */
  healthCheck?(): Promise<{ healthy: boolean; message?: string; [key: string]: any }>;

  /**
   * Close the storage provider
   */
  close(): Promise<void>;
}
