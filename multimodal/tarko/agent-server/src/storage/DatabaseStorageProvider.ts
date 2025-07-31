/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/agent-server-interface';
import { StorageProvider, SessionMetadata, AgentServerStorageOptions } from './types';

/**
 * Abstract database storage provider
 * Base class for implementing database-specific storage providers
 * Extend this class to implement storage with MongoDB, PostgreSQL, etc.
 */
export abstract class DatabaseStorageProvider implements StorageProvider {
  protected config: AgentServerStorageOptions['database'];

  constructor(config?: AgentServerStorageOptions['database']) {
    this.config = config || { url: '' };
  }

  abstract initialize(): Promise<void>;
  abstract createSession(metadata: SessionMetadata): Promise<SessionMetadata>;
  abstract updateSessionMetadata(
    sessionId: string,
    metadata: Partial<Omit<SessionMetadata, 'id'>>,
  ): Promise<SessionMetadata>;
  abstract getSessionMetadata(sessionId: string): Promise<SessionMetadata | null>;
  abstract getAllSessions(): Promise<SessionMetadata[]>;
  abstract deleteSession(sessionId: string): Promise<boolean>;
  abstract saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void>;
  abstract getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]>;
  abstract close(): Promise<void>;
}
