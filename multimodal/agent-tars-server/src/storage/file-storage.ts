/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { Event } from '@agent-tars/core';
import { StorageProvider, SessionMetadata } from './types';

/**
 * Data structure for lowdb
 */
interface DbSchema {
  sessions: Record<string, SessionMetadata>;
  events: Record<string, Event[]>;
}

/**
 * File-based storage provider using lowdb
 * Stores data in a JSON file for persistence
 * Suitable for local development and small-scale deployments
 */
export class FileStorageProvider implements StorageProvider {
  private db: Low<DbSchema>;
  private initialized = false;
  public readonly dbPath: string;

  constructor(storagePath?: string) {
    // Default to the user's home directory
    const defaultPath = process.env.HOME || process.env.USERPROFILE || '.';
    const baseDir = storagePath || path.join(defaultPath, '.agent-tars');

    // Create the directory if it doesn't exist
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    this.dbPath = path.join(baseDir, 'storage.json');
    const adapter = new JSONFile<DbSchema>(this.dbPath);
    this.db = new Low<DbSchema>(adapter, { sessions: {}, events: {} });
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      try {
        await this.db.read();
        // Initialize if file was empty or new
        this.db.data = this.db.data || { sessions: {}, events: {} };
        this.initialized = true;
      } catch (error) {
        // If file doesn't exist or is invalid JSON, create a new one
        this.db.data = { sessions: {}, events: {} };
        await this.db.write();
        this.initialized = true;
      }
    }
  }

  async createSession(metadata: SessionMetadata): Promise<SessionMetadata> {
    await this.ensureInitialized();

    const sessionData = {
      ...metadata,
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: metadata.updatedAt || Date.now(),
    };

    this.db.data.sessions[metadata.id] = sessionData;
    this.db.data.events[metadata.id] = [];

    await this.db.write();
    return sessionData;
  }

  async updateSessionMetadata(
    sessionId: string,
    metadata: Partial<Omit<SessionMetadata, 'id'>>,
  ): Promise<SessionMetadata> {
    await this.ensureInitialized();

    const session = this.db.data.sessions[sessionId];
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updatedSession = {
      ...session,
      ...metadata,
      updatedAt: Date.now(),
    };

    this.db.data.sessions[sessionId] = updatedSession;
    await this.db.write();

    return updatedSession;
  }

  async getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
    await this.ensureInitialized();
    return this.db.data.sessions[sessionId] || null;
  }

  async getAllSessions(): Promise<SessionMetadata[]> {
    await this.ensureInitialized();
    return Object.values(this.db.data.sessions);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.db.data.sessions[sessionId]) {
      return false;
    }

    delete this.db.data.sessions[sessionId];
    delete this.db.data.events[sessionId];

    await this.db.write();
    return true;
  }

  async saveEvent(sessionId: string, event: Event): Promise<void> {
    await this.ensureInitialized();

    if (!this.db.data.sessions[sessionId]) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!this.db.data.events[sessionId]) {
      this.db.data.events[sessionId] = [];
    }

    this.db.data.events[sessionId].push(event);

    // Update session timestamp
    this.db.data.sessions[sessionId].updatedAt = Date.now();

    await this.db.write();
  }

  async getSessionEvents(sessionId: string): Promise<Event[]> {
    await this.ensureInitialized();

    if (!this.db.data.sessions[sessionId]) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return this.db.data.events[sessionId] || [];
  }

  async close(): Promise<void> {
    // Make sure any pending writes are flushed
    if (this.initialized) {
      await this.db.write();
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
