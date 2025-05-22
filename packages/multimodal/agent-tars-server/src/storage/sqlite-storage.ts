/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { Event } from '@agent-tars/core';
import { StorageProvider, SessionMetadata } from './types';

// Define row types for better type safety
interface SessionRow {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string | null;
  workingDirectory: string;
  tags: string | null;
}

interface EventRow {
  id: number;
  sessionId: string;
  timestamp: number;
  eventData: string;
}

/**
 * SQLite-based storage provider
 * Provides high-performance, file-based storage using SQLite
 * Optimized for handling large amounts of event data
 */
export class SQLiteStorageProvider implements StorageProvider {
  private db: Database.Database;
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

    this.dbPath = path.join(baseDir, 'agent-tars.db');
    this.db = new Database(this.dbPath);
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      try {
        // Enable WAL mode for better concurrent performance
        this.db.pragma('journal_mode = WAL');

        // Create sessions table
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            name TEXT,
            workingDirectory TEXT NOT NULL,
            tags TEXT
          )
        `);

        // Create events table with foreign key to sessions
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sessionId TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            eventData TEXT NOT NULL,
            FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
          )
        `);

        // Create index on sessionId for faster queries
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_events_sessionId ON events (sessionId)
        `);

        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize SQLite database:', error);
        throw error;
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

    const tagsJson = sessionData.tags ? JSON.stringify(sessionData.tags) : null;

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, createdAt, updatedAt, name, workingDirectory, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      sessionData.id,
      sessionData.createdAt,
      sessionData.updatedAt,
      sessionData.name || null,
      sessionData.workingDirectory,
      tagsJson,
    );

    return sessionData;
  }

  async updateSessionMetadata(
    sessionId: string,
    metadata: Partial<Omit<SessionMetadata, 'id'>>,
  ): Promise<SessionMetadata> {
    await this.ensureInitialized();

    // First, get the current session data
    const session = await this.getSessionMetadata(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updatedSession = {
      ...session,
      ...metadata,
      updatedAt: Date.now(),
    };

    // Build the dynamic update statement
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (metadata.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(metadata.name || null);
    }

    if (metadata.workingDirectory !== undefined) {
      updateFields.push('workingDirectory = ?');
      updateValues.push(metadata.workingDirectory);
    }

    if (metadata.tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(metadata.tags ? JSON.stringify(metadata.tags) : null);
    }

    // Always update the updatedAt timestamp
    updateFields.push('updatedAt = ?');
    updateValues.push(updatedSession.updatedAt);

    // Add the sessionId as the last parameter
    updateValues.push(sessionId);

    // Execute the update
    const updateStmt = this.db.prepare(`
      UPDATE sessions
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    updateStmt.run(...updateValues);

    return updatedSession;
  }

  async getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
    await this.ensureInitialized();

    const stmt = this.db.prepare<{ id: string }, SessionRow>(`
      SELECT id, createdAt, updatedAt, name, workingDirectory, tags
      FROM sessions
      WHERE id = ?
    `);

    const row = stmt.get({ id: sessionId });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      name: row.name || undefined,
      workingDirectory: row.workingDirectory,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    };
  }

  async getAllSessions(): Promise<SessionMetadata[]> {
    await this.ensureInitialized();

    const stmt = this.db.prepare<{}, SessionRow>(`
      SELECT id, createdAt, updatedAt, name, workingDirectory, tags
      FROM sessions
      ORDER BY updatedAt DESC
    `);

    const rows = stmt.all({});

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      name: row.name || undefined,
      workingDirectory: row.workingDirectory,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    }));
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();

    // Begin transaction
    const transaction = this.db.transaction(() => {
      // Delete events first (though the foreign key would handle this)
      const deleteEventsStmt = this.db.prepare('DELETE FROM events WHERE sessionId = ?');
      deleteEventsStmt.run(sessionId);

      // Delete the session
      const deleteSessionStmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
      const result = deleteSessionStmt.run(sessionId);

      return result.changes > 0;
    });

    return transaction();
  }

  async saveEvent(sessionId: string, event: Event): Promise<void> {
    await this.ensureInitialized();

    // Check if session exists
    const sessionExists = this.db.prepare('SELECT 1 FROM sessions WHERE id = ?').get(sessionId);
    if (!sessionExists) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const timestamp = Date.now();
    const eventData = JSON.stringify(event);

    const stmt = this.db.prepare(`
      INSERT INTO events (sessionId, timestamp, eventData)
      VALUES (?, ?, ?)
    `);

    stmt.run(sessionId, timestamp, eventData);

    // Update session's updatedAt timestamp
    this.db.prepare('UPDATE sessions SET updatedAt = ? WHERE id = ?').run(timestamp, sessionId);
  }

  async getSessionEvents(sessionId: string): Promise<Event[]> {
    await this.ensureInitialized();

    // Verify session exists
    const sessionExists = this.db
      .prepare<{ id: string }, { '1': number }>('SELECT 1 FROM sessions WHERE id = ?')
      .get({ id: sessionId });
    if (!sessionExists) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const stmt = this.db.prepare<{ sessionId: string }, { eventData: string }>(`
      SELECT eventData
      FROM events
      WHERE sessionId = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all({ sessionId });

    return rows.map((row) => JSON.parse(row.eventData));
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
