/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, AgentStorageImplementation } from '@tarko/interface';
import { StorageProvider, SessionInfo } from './types';

/**
 * Abstract database storage provider
 * Base class for implementing database-specific storage providers
 * Extend this class to implement storage with MongoDB, PostgreSQL, etc.
 */
export abstract class DatabaseStorageProvider implements StorageProvider {
  protected config: AgentStorageImplementation;

  constructor(config: AgentStorageImplementation) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract createSession(metadata: SessionInfo): Promise<SessionInfo>;
  abstract updateSessionInfo(
    sessionId: string,
    sessionInfo: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo>;
  abstract getSessionInfo(sessionId: string): Promise<SessionInfo | null>;
  abstract getAllSessions(): Promise<SessionInfo[]>;
  abstract deleteSession(sessionId: string): Promise<boolean>;
  abstract saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void>;
  abstract getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]>;
  abstract close(): Promise<void>;
}
