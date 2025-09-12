/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import {
  AgentEventStream,
  getGlobalStorageDirectory,
  SessionInfo,
  SqliteAgentStorageImplementation,
  TARKO_CONSTANTS,
} from '@tarko/interface';
import { StorageProvider } from './types';

// Define row types for better type safety
interface SessionRow {
  id: string;
  createdAt: number;
  updatedAt: number;
  workspace: string;
  userId?: string;
  metadata: string | null; // JSON string containing all extensible metadata
}


interface ExistsResult {
  existsFlag: number;
}

/**
 * SQLite-based storage provider using Node.js native SQLite
 * Provides high-performance, file-based storage using the built-in SQLite module
 * Optimized for handling large amounts of event data
 */
export class SQLiteStorageProvider implements StorageProvider {
  private db: DatabaseSync;
  private initialized = false;
  public readonly dbPath: string;

  constructor(config: SqliteAgentStorageImplementation) {
    // Default to the user's home directory
    const baseDir = getGlobalStorageDirectory(config.baseDir);
    const dbName = config.dbName ?? TARKO_CONSTANTS.SESSION_DATA_DB_NAME;

    // Create the directory if it doesn't exist
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    this.dbPath = path.join(baseDir, dbName);
    this.db = new DatabaseSync(this.dbPath, { open: false });
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      try {
        // Open the database
        this.db.open();

        // Enable WAL mode for better concurrent performance
        this.db.exec('PRAGMA journal_mode = WAL');

        // Create sessions table with JSON schema design
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            workspace TEXT NOT NULL,
            userId TEXT,
            metadata TEXT -- JSON string for all extensible metadata
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

        // Enable foreign keys
        this.db.exec('PRAGMA foreign_keys = ON');

        // Add userId column if it doesn't exist (migration)
        try {
          this.db.exec('ALTER TABLE sessions ADD COLUMN userId TEXT');
        } catch (error) {
          // Column may already exist, ignore error
        }

        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize SQLite database:', error);
        throw error;
      }
    }
  }

  async createSession(metadata: SessionInfo): Promise<SessionInfo> {
    await this.ensureInitialized();

    const sessionData = {
      ...metadata,
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: metadata.updatedAt || Date.now(),
    };

    const metadataJson = sessionData.metadata ? JSON.stringify(sessionData.metadata) : null;

    try {
      const insertQuery = `
        INSERT INTO sessions (id, createdAt, updatedAt, workspace, userId, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const stmt = this.db.prepare(insertQuery);
      stmt.run(
        sessionData.id,
        sessionData.createdAt,
        sessionData.updatedAt,
        sessionData.workspace || '',
        (sessionData as any).userId || null,
        metadataJson,
      );

      return sessionData;
    } catch (error) {
      console.error(`Failed to create session ${sessionData.id}:`, error);
      throw new Error(
        `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateSessionInfo(
    sessionId: string,
    sessionInfo: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo> {
    await this.ensureInitialized();

    // First, get the current session data
    const session = await this.getSessionInfo(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updatedSession = {
      ...session,
      ...sessionInfo,
      updatedAt: Date.now(),
    };

    try {
      const params: Array<string | number | null> = [];
      const setClauses: string[] = [];

      if (sessionInfo.workspace !== undefined) {
        setClauses.push('workspace = ?');
        params.push(sessionInfo.workspace);
      }

      if (sessionInfo.metadata !== undefined) {
        setClauses.push('metadata = ?');
        params.push(sessionInfo.metadata ? JSON.stringify(sessionInfo.metadata) : null);
      }

      if ((sessionInfo as any).userId !== undefined) {
        setClauses.push('userId = ?');
        params.push((sessionInfo as any).userId);
      }

      // Always update the timestamp
      setClauses.push('updatedAt = ?');
      params.push(updatedSession.updatedAt);

      // Add the session ID for the WHERE clause
      params.push(sessionId);

      if (setClauses.length === 1) {
        // Only updatedAt
        return updatedSession; // Nothing meaningful to update
      }

      const updateQuery = `
        UPDATE sessions
        SET ${setClauses.join(', ')}
        WHERE id = ?
      `;

      const updateStmt = this.db.prepare(updateQuery);
      updateStmt.run(...params);

      return updatedSession;
    } catch (error) {
      console.error(`Failed to update session ${sessionId}:`, error);
      throw new Error(
        `Failed to update session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    await this.ensureInitialized();

    try {
      const stmt = this.db.prepare(`
        SELECT id, createdAt, updatedAt, workspace, userId, metadata
        FROM sessions
        WHERE id = ?
      `);

      const row = stmt.get(sessionId) as SessionRow | undefined;

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        workspace: row.workspace || '',
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        ...(row.userId && { userId: row.userId }),
      } as SessionInfo;
    } catch (error) {
      console.error(`Failed to get session ${sessionId}:`, error);
      throw new Error(
        `Failed to get session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getAllSessions(): Promise<SessionInfo[]> {
    await this.ensureInitialized();

    try {
      const stmt = this.db.prepare(`
        SELECT id, createdAt, updatedAt, workspace, userId, metadata
        FROM sessions
        ORDER BY updatedAt DESC
      `);

      const rows = stmt.all() as unknown as SessionRow[];

      return rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        workspace: row.workspace || '',
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        ...(row.userId && { userId: row.userId }),
      } as SessionInfo));
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      throw new Error(
        `Failed to get all sessions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    await this.ensureInitialized();

    try {
      const stmt = this.db.prepare(`
        SELECT id, createdAt, updatedAt, workspace, userId, metadata
        FROM sessions
        WHERE userId = ?
        ORDER BY updatedAt DESC
      `);

      const rows = stmt.all(userId) as unknown as SessionRow[];

      return rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        workspace: row.workspace || '',
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        userId: row.userId,
      } as SessionInfo));
    } catch (error) {
      console.error(`Failed to get user sessions for ${userId}:`, error);
      throw new Error(
        `Failed to get user sessions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      // Delete events first (though the foreign key would handle this)
      const deleteEventsStmt = this.db.prepare('DELETE FROM events WHERE sessionId = ?');
      deleteEventsStmt.run(sessionId);

      // Delete the session
      const deleteSessionStmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
      const result = deleteSessionStmt.run(sessionId);

      return result.changes > 0;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
      throw new Error(
        `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void> {
    await this.ensureInitialized();

    try {
      // Check if session exists
      const sessionExistsStmt = this.db.prepare(`
        SELECT 1 as existsFlag FROM sessions WHERE id = ?
      `);

      const sessionExists = sessionExistsStmt.get(sessionId) as ExistsResult | undefined;
      if (!sessionExists || !sessionExists.existsFlag) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const timestamp = Date.now();
      const eventData = JSON.stringify(event);

      // Insert the event
      const insertEventStmt = this.db.prepare(`
        INSERT INTO events (sessionId, timestamp, eventData)
        VALUES (?, ?, ?)
      `);

      insertEventStmt.run(sessionId, timestamp, eventData);

      // Update session's updatedAt timestamp
      const updateSessionStmt = this.db.prepare(`
        UPDATE sessions SET updatedAt = ? WHERE id = ?
      `);

      updateSessionStmt.run(timestamp, sessionId);
    } catch (error) {
      console.error(`Failed to save event for session ${sessionId}:`, error);
      throw new Error(
        `Failed to save event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]> {
    await this.ensureInitialized();

    try {
      const stmt = this.db.prepare(`
        SELECT eventData
        FROM events
        WHERE sessionId = ?
        ORDER BY timestamp ASC, id ASC
      `);

      const rows = stmt.all(sessionId) as unknown as { eventData: string }[];

      // Return empty array if no events found (instead of throwing error)
      if (!rows || rows.length === 0) {
        return [];
      }

      return rows.map((row) => {
        try {
          return JSON.parse(row.eventData) as AgentEventStream.Event;
        } catch (error) {
          console.error(`Failed to parse event data: ${row.eventData}`);
          return {
            type: 'system',
            message: 'Failed to parse event data',
            timestamp: Date.now(),
          } as AgentEventStream.Event;
        }
      });
    } catch (error) {
      console.error(`Failed to get events for session ${sessionId}:`, error);
      // Return empty array instead of throwing error to allow sessions to load
      return [];
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string; [key: string]: any }> {
    try {
      if (!this.db || !this.db.isOpen) {
        return { healthy: false, message: 'SQLite database is not open' };
      }

      // Simple query to test database health
      const stmt = this.db.prepare('SELECT 1 as test');
      const result = stmt.get() as { test: number } | undefined;

      if (result && result.test === 1) {
        return {
          healthy: true,
          message: 'SQLite database is healthy',
          path: this.dbPath,
          isOpen: this.db.isOpen,
        };
      } else {
        return { healthy: false, message: 'SQLite database test query failed' };
      }
    } catch (error) {
      return {
        healthy: false,
        message: `SQLite health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async close(): Promise<void> {
    if (this.db && this.db.isOpen) {
      this.db.close();
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
