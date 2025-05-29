/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from '@agent-tars/core';
import { StorageProvider, SessionMetadata } from './types';

/**
 * In-memory storage provider
 * Simple implementation that stores data in memory
 * Useful for testing and development
 * Note: Data will be lost when the server restarts
 */
export class MemoryStorageProvider implements StorageProvider {
  private sessions: Map<string, SessionMetadata> = new Map();
  private events: Map<string, Event[]> = new Map();

  async initialize(): Promise<void> {
    // No initialization needed for memory storage
  }

  async createSession(metadata: SessionMetadata): Promise<SessionMetadata> {
    this.sessions.set(metadata.id, {
      ...metadata,
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: metadata.updatedAt || Date.now(),
    });
    this.events.set(metadata.id, []);
    return this.sessions.get(metadata.id)!;
  }

  async updateSessionMetadata(
    sessionId: string,
    metadata: Partial<Omit<SessionMetadata, 'id'>>,
  ): Promise<SessionMetadata> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updatedSession = {
      ...session,
      ...metadata,
      updatedAt: Date.now(),
    };

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getAllSessions(): Promise<SessionMetadata[]> {
    return Array.from(this.sessions.values());
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = this.sessions.delete(sessionId);
    this.events.delete(sessionId);
    return deleted;
  }

  async saveEvent(sessionId: string, event: Event): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const sessionEvents = this.events.get(sessionId) || [];
    sessionEvents.push(event);
    this.events.set(sessionId, sessionEvents);

    // Update the session's updatedAt timestamp
    await this.updateSessionMetadata(sessionId, { updatedAt: Date.now() });
  }

  async getSessionEvents(sessionId: string): Promise<Event[]> {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return this.events.get(sessionId) || [];
  }

  async close(): Promise<void> {
    // No cleanup needed for memory storage
  }
}
