/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, AgentStorageImplementation } from '@tarko/interface';
import { StorageProvider, SessionItemInfo } from './types';

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
  abstract createSession(metadata: SessionItemInfo): Promise<SessionItemInfo>;
  abstract updateSessionItemInfo(
    sessionId: string,
    sessionItemInfo: Partial<Omit<SessionItemInfo, 'id'>>,
  ): Promise<SessionItemInfo>;
  abstract getSessionItemInfo(sessionId: string): Promise<SessionItemInfo | null>;
  abstract getAllSessions(): Promise<SessionItemInfo[]>;
  abstract deleteSession(sessionId: string): Promise<boolean>;
  abstract saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void>;
  abstract getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]>;
  abstract close(): Promise<void>;
}
