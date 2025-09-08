/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/interface';
import { StorageProvider, SessionInfo } from './types';

/**
 * In-memory storage provider
 * Simple implementation that stores data in memory
 * Useful for testing and development
 * Note: Data will be lost when the server restarts
 */
export class MemoryStorageProvider implements StorageProvider {
  private sessions: Map<string, SessionInfo> = new Map();
  private events: Map<string, AgentEventStream.Event[]> = new Map();

  async initialize(): Promise<void> {
    // No initialization needed for memory storage
  }

  async createSession(metadata: SessionInfo): Promise<SessionInfo> {
    this.sessions.set(metadata.id, {
      ...metadata,
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: metadata.updatedAt || Date.now(),
    });
    this.events.set(metadata.id, []);
    return this.sessions.get(metadata.id)!;
  }

  async updateSessionInfo(
    sessionId: string,
    metadata: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo> {
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

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getAllSessions(): Promise<SessionInfo[]> {
    return Array.from(this.sessions.values());
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = this.sessions.delete(sessionId);
    this.events.delete(sessionId);
    return deleted;
  }

  async saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const sessionEvents = this.events.get(sessionId) || [];
    sessionEvents.push(event);
    this.events.set(sessionId, sessionEvents);

    // Update the session's updatedAt timestamp
    await this.updateSessionInfo(sessionId, { updatedAt: Date.now() });
  }

  async getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]> {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return this.events.get(sessionId) || [];
  }

  async close(): Promise<void> {
    // No cleanup needed for memory storage
  }
}
