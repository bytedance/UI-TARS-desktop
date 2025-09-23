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
import { 
  IDAOFactory, 
  IUserConfigDAO, 
  ISessionDAO, 
  IEventDAO, 
  ISandboxAllocationDAO 
} from '../interfaces';
import { UserConfigDAO } from './UserConfigDAO';
import { SessionDAO } from './SessionDAO';
import { EventDAO } from './EventDAO';
import { SandboxAllocationDAO } from './SandboxAllocationDAO';

/**
 * SQLite implementation of IDAOFactory
 * Manages SQLite database connection and provides DAO instances
 */
export class SQLiteDAOFactory implements IDAOFactory {
  private db: DatabaseSync;
  private initialized = false;
  private config: SqliteAgentStorageImplementation;
  public readonly dbPath: string;
  
  // DAO instance cache
  private userConfigDAO: IUserConfigDAO | null = null;
  private sessionDAO: ISessionDAO | null = null;
  private eventDAO: IEventDAO | null = null;
  private sandboxAllocationDAO: ISandboxAllocationDAO | null = null;

  constructor(config: SqliteAgentStorageImplementation) {
    this.config = config;
    
    // Setup database path
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
    if (this.initialized) {
      return;
    }

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

      // Create user_configs table (new for DAO support)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_configs (
          userId TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          config TEXT NOT NULL -- JSON string for user configuration
        )
      `);

      // Create sandbox_allocations table (new for DAO support)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sandbox_allocations (
          sandboxId TEXT PRIMARY KEY,
          sandboxUrl TEXT NOT NULL,
          userId TEXT,
          sessionId TEXT,
          allocationStrategy TEXT NOT NULL CHECK (
            allocationStrategy IN ('Shared-Pool', 'User-Exclusive', 'Session-Exclusive')
          ),
          createdAt INTEGER NOT NULL,
          lastUsedAt INTEGER NOT NULL,
          isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1))
        )
      `);

      // Create indexes for better performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_events_sessionId ON events (sessionId)
      `);
      
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_events_sessionId_timestamp ON events (sessionId, timestamp)
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions (userId)
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_updatedAt ON sessions (updatedAt DESC)
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sandbox_allocations_userId ON sandbox_allocations (userId)
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sandbox_allocations_sessionId ON sandbox_allocations (sessionId)
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sandbox_allocations_strategy_active ON sandbox_allocations (allocationStrategy, isActive)
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sandbox_allocations_lastUsed ON sandbox_allocations (lastUsedAt)
      `);

      // Enable foreign keys
      this.db.exec('PRAGMA foreign_keys = ON');

      // Add userId column to sessions if it doesn't exist (migration for compatibility)
      try {
        this.db.exec('ALTER TABLE sessions ADD COLUMN userId TEXT');
      } catch (error) {
        // Column may already exist, ignore error
      }

      this.initialized = true;
      console.log('SQLite DAO Factory initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite DAO Factory:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized && this.db.isOpen;
  }

  getUserConfigDAO(): IUserConfigDAO {
    this.ensureInitialized();
    
    if (!this.userConfigDAO) {
      this.userConfigDAO = new UserConfigDAO(this.db);
    }
    
    return this.userConfigDAO;
  }

  getSessionDAO(): ISessionDAO {
    this.ensureInitialized();
    
    if (!this.sessionDAO) {
      this.sessionDAO = new SessionDAO(this.db);
    }
    
    return this.sessionDAO;
  }

  getEventDAO(): IEventDAO {
    this.ensureInitialized();
    
    if (!this.eventDAO) {
      this.eventDAO = new EventDAO(this.db);
    }
    
    return this.eventDAO;
  }

  getSandboxAllocationDAO(): ISandboxAllocationDAO {
    this.ensureInitialized();
    
    if (!this.sandboxAllocationDAO) {
      this.sandboxAllocationDAO = new SandboxAllocationDAO(this.db);
    }
    
    return this.sandboxAllocationDAO;
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
          message: 'SQLite DAO Factory is healthy',
          path: this.dbPath,
          isOpen: this.db.isOpen,
        };
      } else {
        return { healthy: false, message: 'SQLite database test query failed' };
      }
    } catch (error) {
      return {
        healthy: false,
        message: `SQLite DAO Factory health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async close(): Promise<void> {
    if (this.db && this.db.isOpen) {
      this.db.close();
      this.initialized = false;
      
      // Clear DAO instances
      this.userConfigDAO = null;
      this.sessionDAO = null;
      this.eventDAO = null;
      this.sandboxAllocationDAO = null;
      
      console.log('SQLite DAO Factory closed successfully');
    }
  }

  // StorageProvider methods - delegate to DAOs
  async createSession(metadata: SessionInfo): Promise<SessionInfo> {
    return this.getSessionDAO().createSession(metadata);
  }

  async updateSessionInfo(
    sessionId: string,
    sessionInfo: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo> {
    return this.getSessionDAO().updateSessionInfo(sessionId, sessionInfo);
  }

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    return this.getSessionDAO().getSessionInfo(sessionId);
  }

  async getAllSessions(): Promise<SessionInfo[]> {
    return this.getSessionDAO().getAllSessions();
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    return this.getSessionDAO().getUserSessions(userId);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    // Delete events first, then session
    await this.getEventDAO().deleteSessionEvents(sessionId);
    return this.getSessionDAO().deleteSession(sessionId);
  }

  async saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void> {
    // Check if session exists first
    const sessionExists = await this.getSessionDAO().sessionExists(sessionId);
    if (!sessionExists) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Save the event
    await this.getEventDAO().saveEvent(sessionId, event);
    
    // Update session timestamp
    await this.getSessionDAO().updateSessionTimestamp(sessionId);
  }

  async getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]> {
    return this.getEventDAO().getSessionEvents(sessionId);
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db.isOpen) {
      throw new Error('SQLite DAO Factory not initialized. Call initialize() first.');
    }
  }
}