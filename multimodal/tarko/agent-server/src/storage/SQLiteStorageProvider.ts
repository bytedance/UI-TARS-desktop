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
import { StorageProvider, SessionInfo, LegacySessionItemInfo } from './types';

// Define row types for better type safety
interface SessionRow {
  id: string;
  createdAt: number;
  updatedAt: number;
  workspace: string;
  metadata: string | null; // JSON string containing all extensible metadata
}

// Legacy row type for migration compatibility
interface LegacySessionRow {
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

        // Create sessions table with JSON schema design
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            workspace TEXT NOT NULL,
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

        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize SQLite database:', error);
        throw error;
      }
    }
  }

  /**
   * Check and migrate from old database schema to JSON schema if needed
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

      // Check if we need to migrate to JSON schema
      const hasMetadataColumn = columns.some((col) => col.name === 'metadata');
      const hasLegacyColumns = columns.some((col) =>
        ['name', 'tags', 'modelConfig'].includes(col.name),
      );

      if (!hasMetadataColumn && hasLegacyColumns) {
        console.log('Migration needed: converting to JSON schema design');
        await this.performJsonSchemaMigration();
      }
    } catch (error) {
      console.error('Failed to migrate database schema:', error);
      throw new Error(
        `Database migration failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Migrate from legacy column-based schema to JSON metadata schema
   * This is the final migration - no more schema changes needed after this
   * SAFETY: Uses database transaction and safe table renaming to ensure data integrity
   * FIXED: Prevents events table data loss by avoiding direct DROP of FK-referenced table
   */
  private async performJsonSchemaMigration(): Promise<void> {
    console.log('Starting SAFE migration to JSON schema design...');

    // Start transaction for atomic migration
    this.db.exec('BEGIN TRANSACTION');

    try {
      // Temporarily disable foreign key constraints to preserve events
      this.db.exec('PRAGMA foreign_keys = OFF');

      // SAFETY: Clean up any leftover temporary tables from failed migrations
      try {
        this.db.exec('DROP TABLE IF EXISTS sessions_new');
        console.log('Cleaned up any existing temporary migration table');
      } catch (cleanupError) {
        console.warn('Could not clean up temporary table (this is usually fine):', cleanupError);
      }

      // SAFETY CHECK: Count existing data before migration
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions');
      const originalCount = (countStmt.get() as { count: number }).count;
      console.log(`Migration starting: ${originalCount} sessions to migrate`);

      if (originalCount === 0) {
        console.log('No sessions to migrate, skipping migration');
        this.db.exec('ROLLBACK');
        return;
      }

      // Get current table schema for dynamic column detection
      const tableInfoStmt = this.db.prepare('PRAGMA table_info(sessions)');
      const currentColumns = tableInfoStmt.all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: any;
        pk: number;
      }>;

      // Create new sessions table with JSON schema
      this.db.exec(`
      CREATE TABLE sessions_new (
        id TEXT PRIMARY KEY,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      workspace TEXT NOT NULL,
      metadata TEXT
    )
    `);

      // Migrate data from legacy schema to JSON schema
      // Dynamically build SELECT query based on available columns
      const columnNames = currentColumns.map((col: any) => col.name);
      const selectColumns = [
        'id',
        'createdAt',
        'updatedAt',
        columnNames.includes('name') ? 'name' : 'NULL as name',
        columnNames.includes('workspace') ? 'workspace' : 'NULL as workspace',
        columnNames.includes('workingDirectory') ? 'workingDirectory' : 'NULL as workingDirectory',
        columnNames.includes('tags') ? 'tags' : 'NULL as tags',
        columnNames.includes('modelConfig') ? 'modelConfig' : 'NULL as modelConfig',
      ].join(', ');

      const legacyStmt = this.db.prepare(`
        SELECT ${selectColumns}
        FROM sessions
      `);

      const insertStmt = this.db.prepare(`
  INSERT INTO sessions_new (id, createdAt, updatedAt, workspace, metadata)
  VALUES (?, ?, ?, ?, ?)
  `);

      const legacyRows = legacyStmt.all() as Array<{
        id: string;
        createdAt: number;
        updatedAt: number;
        name: string | null;
        workspace: string | null;
        workingDirectory: string | null;
        tags: string | null;
        modelConfig: string | null;
      }>;

      console.log(`Migrating ${legacyRows.length} sessions...`);

      for (const row of legacyRows) {
        // Convert legacy data to JSON metadata format
        const metadata: SessionInfo['metadata'] = { version: 1 };

        if (row.name) metadata.name = row.name;
        if (row.tags) {
          try {
            metadata.tags = JSON.parse(row.tags);
          } catch {
            // If tags parsing fails, store as string array
            metadata.tags = [row.tags];
          }
        }
        if (row.modelConfig) {
          try {
            metadata.modelConfig = JSON.parse(row.modelConfig);
          } catch {
            // If modelConfig parsing fails, ignore
          }
        }

        const workspace = row.workspace || row.workingDirectory || '';
        const metadataJson = Object.keys(metadata).length > 1 ? JSON.stringify(metadata) : null;

        insertStmt.run(row.id, row.createdAt, row.updatedAt, workspace, metadataJson);
      }

      // SAFETY CHECK: Verify all data was migrated correctly
      const newCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions_new');
      const newCount = (newCountStmt.get() as { count: number }).count;

      if (newCount !== originalCount) {
        throw new Error(
          `Migration data loss detected! Original: ${originalCount}, New: ${newCount}`,
        );
      }

      console.log(`Migration verification passed: ${newCount}/${originalCount} sessions migrated`);

      // ULTRA-SAFE: Use column-by-column migration instead of table replacement
      // This completely avoids any table rename/drop operations that could trigger FK issues

      // Step 1: Add missing columns to existing sessions table
      const hasWorkspaceColumn = columnNames.includes('workspace');
      const hasMetadataColumn = columnNames.includes('metadata');

      if (!hasWorkspaceColumn) {
        console.log('Adding workspace column...');
        this.db.exec("ALTER TABLE sessions ADD COLUMN workspace TEXT DEFAULT ''");
      }

      if (!hasMetadataColumn) {
        console.log('Adding metadata column...');
        this.db.exec('ALTER TABLE sessions ADD COLUMN metadata TEXT');
      }

      // Step 2: Update workspace column from workingDirectory if needed
      if (!hasWorkspaceColumn && columnNames.includes('workingDirectory')) {
        console.log('Migrating workingDirectory to workspace...');
        this.db.exec(
          "UPDATE sessions SET workspace = COALESCE(workingDirectory, '') WHERE workspace IS NULL OR workspace = ''",
        );
      }

      // Step 3: Migrate data from old columns to new metadata column
      if (!hasMetadataColumn) {
        console.log('Migrating legacy columns to metadata...');
        const updateStmt = this.db.prepare(`
          UPDATE sessions 
          SET metadata = ?
          WHERE id = ?
        `);

        for (const row of legacyRows) {
          const metadata: SessionInfo['metadata'] = { version: 1 };
          if (row.name) metadata.name = row.name;
          if (row.tags) {
            try {
              metadata.tags = JSON.parse(row.tags);
            } catch {
              metadata.tags = [row.tags];
            }
          }
          if (row.modelConfig) {
            try {
              metadata.modelConfig = JSON.parse(row.modelConfig);
            } catch {}
          }

          const metadataJson = Object.keys(metadata).length > 1 ? JSON.stringify(metadata) : null;
          updateStmt.run(metadataJson, row.id);
        }
      }

      // Step 4: Clean up temporary table
      this.db.exec('DROP TABLE sessions_new');

      console.log('Column-based migration completed successfully - events table preserved');

      // Re-enable foreign key constraints
      this.db.exec('PRAGMA foreign_keys = ON');

      // Commit transaction
      this.db.exec('COMMIT');

      console.log('✅ JSON schema migration completed successfully with data verification');
    } catch (error) {
      // Rollback on any error to preserve original data
      console.error('❌ Migration failed, rolling back to preserve data:', error);
      try {
        this.db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }
      throw new Error(
        `Migration failed and rolled back: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      // Dynamic insert to handle both old and new schema
      const tableInfoStmt = this.db.prepare('PRAGMA table_info(sessions)');
      const columns = tableInfoStmt.all() as Array<{ name: string }>;
      const columnNames = columns.map((col) => col.name);

      const hasWorkspace = columnNames.includes('workspace');
      const hasWorkingDirectory = columnNames.includes('workingDirectory');
      const hasMetadata = columnNames.includes('metadata');

      // Build dynamic INSERT query based on available columns
      const insertColumns = ['id', 'createdAt', 'updatedAt'];
      const insertValues: (string | number | null)[] = [
        sessionData.id,
        sessionData.createdAt,
        sessionData.updatedAt,
      ];
      const placeholders = ['?', '?', '?'];

      if (hasWorkspace) {
        insertColumns.push('workspace');
        insertValues.push(sessionData.workspace);
        placeholders.push('?');
      }

      if (hasWorkingDirectory) {
        insertColumns.push('workingDirectory');
        insertValues.push(sessionData.workspace); // Use workspace value for workingDirectory
        placeholders.push('?');
      }

      if (hasMetadata) {
        insertColumns.push('metadata');
        insertValues.push(metadataJson);
        placeholders.push('?');
      }

      const insertQuery = `
        INSERT INTO sessions (${insertColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `;

      const stmt = this.db.prepare(insertQuery);
      stmt.run(...insertValues);

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
      // Dynamic query to handle missing workspace column
      const tableInfoStmt = this.db.prepare('PRAGMA table_info(sessions)');
      const columns = tableInfoStmt.all() as Array<{ name: string }>;
      const columnNames = columns.map((col) => col.name);

      const hasWorkspace = columnNames.includes('workspace');
      const hasWorkingDirectory = columnNames.includes('workingDirectory');

      const workspaceSelect = hasWorkspace
        ? 'workspace'
        : hasWorkingDirectory
          ? 'workingDirectory as workspace'
          : '"" as workspace';

      const stmt = this.db.prepare(`
        SELECT id, createdAt, updatedAt, ${workspaceSelect}, metadata
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
      };
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
      // Dynamic query to handle missing workspace column
      const tableInfoStmt = this.db.prepare('PRAGMA table_info(sessions)');
      const columns = tableInfoStmt.all() as Array<{ name: string }>;
      const columnNames = columns.map((col) => col.name);

      const hasWorkspace = columnNames.includes('workspace');
      const hasWorkingDirectory = columnNames.includes('workingDirectory');

      const workspaceSelect = hasWorkspace
        ? 'workspace'
        : hasWorkingDirectory
          ? 'workingDirectory as workspace'
          : '"" as workspace';

      const stmt = this.db.prepare(`
        SELECT id, createdAt, updatedAt, ${workspaceSelect}, metadata
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
