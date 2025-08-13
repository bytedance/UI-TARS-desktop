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
  SqliteAgentStorageImplementation,
  TARKO_CONSTANTS,
} from '@tarko/interface';
import { StorageProvider, SessionMetadata } from './types';

// Define row types for better type safety
interface SessionRow {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string | null;
  workspace: string;
  tags: string | null;
  modelConfig: string | null;
}

interface EventRow {
  id: number;
  sessionId: string;
  timestamp: number;
  eventData: string;
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

        // Check if we need to migrate from old schema
        await this.migrateIfNeeded();

        // Create sessions table with current schema
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            name TEXT,
            workspace TEXT NOT NULL,
            tags TEXT,
            modelConfig TEXT
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

        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize SQLite database:', error);
        throw error;
      }
    }
  }

  /**
   * Check and migrate from old database schema if needed
   */
  private async migrateIfNeeded(): Promise<void> {
    try {
      // Check if sessions table exists and get its schema
      const tableInfoStmt = this.db.prepare(`
        PRAGMA table_info(sessions)
      `);

      const columns = tableInfoStmt.all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: any;
        pk: number;
      }>;

      if (columns.length === 0) {
        // Table doesn't exist yet, no migration needed
        return;
      }

      let needsMigration = false;

      // Check if we have the old 'workingDirectory' column instead of 'workspace'
      const hasWorkingDirectory = columns.some((col) => col.name === 'workingDirectory');
      const hasWorkspace = columns.some((col) => col.name === 'workspace');

      // Check if we need to add modelConfig column
      const hasModelConfig = columns.some((col) => col.name === 'modelConfig');

      if (hasWorkingDirectory && !hasWorkspace) {
        needsMigration = true;
        console.log('Migration needed: workingDirectory → workspace');
      }

      if (!hasModelConfig) {
        needsMigration = true;
        console.log('Migration needed: adding modelConfig column');
      }

      if (needsMigration) {
        await this.performSchemaMigration(hasWorkingDirectory, hasWorkspace, hasModelConfig);
      }
    } catch (error) {
      console.error('Failed to migrate database schema:', error);
      throw new Error(
        `Database migration failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Execute database schema migration without losing events data
   * Uses ALTER TABLE ADD COLUMN for safe migration that preserves foreign key relationships
   */
  private async performSchemaMigration(
    hasWorkingDirectory: boolean,
    hasWorkspace: boolean,
    hasModelConfig: boolean,
  ): Promise<void> {
    console.log('Starting safe database schema migration...');

    // For workingDirectory -> workspace migration, we need to use the table recreation approach
    // but we'll preserve events by temporarily disabling foreign keys
    if (hasWorkingDirectory && !hasWorkspace) {
      console.log('Migrating workingDirectory to workspace column...');

      // Temporarily disable foreign key constraints to preserve events
      this.db.exec('PRAGMA foreign_keys = OFF');

      // Create new sessions table with updated schema
      this.db.exec(`
        CREATE TABLE sessions_new (
          id TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          name TEXT,
          workspace TEXT NOT NULL,
          tags TEXT,
          modelConfig TEXT
        )
      `);

      // Copy data from old sessions table, renaming workingDirectory to workspace
      this.db.exec(`
        INSERT INTO sessions_new (id, createdAt, updatedAt, name, workspace, tags, modelConfig)
        SELECT id, createdAt, updatedAt, name, workingDirectory, tags, NULL
        FROM sessions
      `);

      // Drop old sessions table and rename new one
      this.db.exec('DROP TABLE sessions');
      this.db.exec('ALTER TABLE sessions_new RENAME TO sessions');

      // Re-enable foreign key constraints
      this.db.exec('PRAGMA foreign_keys = ON');

      console.log('workingDirectory -> workspace migration completed');
    }
    // For adding modelConfig column, use ALTER TABLE ADD COLUMN (safe operation)
    else if (!hasModelConfig) {
      console.log('Adding modelConfig column...');

      try {
        // Use ALTER TABLE ADD COLUMN for safe schema change that preserves all data and relationships
        this.db.exec('ALTER TABLE sessions ADD COLUMN modelConfig TEXT');
        console.log('modelConfig column added successfully');
      } catch (error) {
        console.error('Failed to add modelConfig column:', error);
        throw error;
      }
    }

    console.log('Database schema migration completed successfully');
  }

  async createSession(metadata: SessionMetadata): Promise<SessionMetadata> {
    await this.ensureInitialized();

    const sessionData = {
      ...metadata,
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: metadata.updatedAt || Date.now(),
    };

    const tagsJson = sessionData.tags ? JSON.stringify(sessionData.tags) : null;
    const modelConfigJson = sessionData.modelConfig
      ? JSON.stringify(sessionData.modelConfig)
      : null;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, createdAt, updatedAt, name, workspace, tags, modelConfig)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        sessionData.id,
        sessionData.createdAt,
        sessionData.updatedAt,
        sessionData.name || null,
        sessionData.workspace,
        tagsJson,
        modelConfigJson,
      );
      return sessionData;
    } catch (error) {
      console.error(`Failed to create session ${sessionData.id}:`, error);
      throw new Error(
        `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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

    try {
      const params: Array<string | number | null> = [];
      const setClauses: string[] = [];

      if (metadata.name !== undefined) {
        setClauses.push('name = ?');
        params.push(metadata.name || null);
      }

      if (metadata.workspace !== undefined) {
        setClauses.push('workspace = ?');
        params.push(metadata.workspace);
      }

      if (metadata.tags !== undefined) {
        setClauses.push('tags = ?');
        params.push(metadata.tags ? JSON.stringify(metadata.tags) : null);
      }

      if (metadata.modelConfig !== undefined) {
        setClauses.push('modelConfig = ?');
        params.push(metadata.modelConfig ? JSON.stringify(metadata.modelConfig) : null);
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

  async getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
    await this.ensureInitialized();

    try {
      const stmt = this.db.prepare(`
        SELECT id, createdAt, updatedAt, name, workspace, tags, modelConfig
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
        name: row.name || undefined,
        workspace: row.workspace,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        modelConfig: row.modelConfig ? JSON.parse(row.modelConfig) : undefined,
      };
    } catch (error) {
      console.error(`Failed to get session ${sessionId}:`, error);
      throw new Error(
        `Failed to get session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getAllSessions(): Promise<SessionMetadata[]> {
    await this.ensureInitialized();

    try {
      const stmt = this.db.prepare(`
        SELECT id, createdAt, updatedAt, name, workspace, tags, modelConfig
        FROM sessions
        ORDER BY updatedAt DESC
      `);

      const rows = stmt.all() as unknown as SessionRow[];

      return rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        name: row.name || undefined,
        workspace: row.workspace,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        modelConfig: row.modelConfig ? JSON.parse(row.modelConfig) : undefined,
      }));
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      throw new Error(
        `Failed to get all sessions: ${error instanceof Error ? error.message : String(error)}`,
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
      // Skip session existence check - just try to get events directly
      // This handles cases where migration may have broken foreign key relationships
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
