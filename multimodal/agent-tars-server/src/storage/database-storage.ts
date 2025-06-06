/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from '@agent-tars/core';
import { StorageProvider, SessionMetadata, StorageOptions } from './types';

/**
 * Abstract database storage provider
 * Base class for implementing database-specific storage providers
 * Extend this class to implement storage with MongoDB, PostgreSQL, etc.
 */
export abstract class DatabaseStorageProvider implements StorageProvider {
  protected config: StorageOptions['database'];

  constructor(config?: StorageOptions['database']) {
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
  abstract saveEvent(sessionId: string, event: Event): Promise<void>;
  abstract getSessionEvents(sessionId: string): Promise<Event[]>;
  abstract close(): Promise<void>;
}
