/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, SessionInfo, SqliteAgentStorageImplementation } from '@tarko/interface';
import { StorageProvider } from './types';
import { SQLiteDAOFactory } from '../dao/sqlite/SQLiteDAOFactory';
import { IDAOFactory } from '../dao/interfaces/IDAOFactory';

/**
 * SQLite-based storage provider using Node.js native SQLite
 * Provides high-performance, file-based storage using the built-in SQLite module
 * Optimized for handling large amounts of event data
 * 
 * Now uses DAO pattern internally while maintaining backward compatibility
 */
export class SQLiteStorageProvider implements StorageProvider {
  private daoFactory: SQLiteDAOFactory;
  private initialized = false;
  public readonly dbPath: string;

  constructor(config: SqliteAgentStorageImplementation) {
    this.daoFactory = new SQLiteDAOFactory(config);
    this.dbPath = this.daoFactory.dbPath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize the DAO factory, which handles all database setup
      await this.daoFactory.initialize();
      
      this.initialized = true;
      console.log('SQLite StorageProvider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite StorageProvider:', error);
      throw new Error(
        `SQLite StorageProvider initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async createSession(metadata: SessionInfo): Promise<SessionInfo> {
    await this.ensureInitialized();
    return this.daoFactory.getSessionDAO().createSession(metadata);
  }

  async updateSessionInfo(
    sessionId: string,
    sessionInfo: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo> {
    await this.ensureInitialized();
    return this.daoFactory.getSessionDAO().updateSessionInfo(sessionId, sessionInfo);
  }

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    await this.ensureInitialized();
    return this.daoFactory.getSessionDAO().getSessionInfo(sessionId);
  }

  async getAllSessions(): Promise<SessionInfo[]> {
    await this.ensureInitialized();
    return this.daoFactory.getSessionDAO().getAllSessions();
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    await this.ensureInitialized();
    return this.daoFactory.getSessionDAO().getUserSessions(userId);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();
    
    // Delete events first, then session
    await this.daoFactory.getEventDAO().deleteSessionEvents(sessionId);
    return this.daoFactory.getSessionDAO().deleteSession(sessionId);
  }

  async saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void> {
    await this.ensureInitialized();
    
    // Check if session exists first
    const sessionExists = await this.daoFactory.getSessionDAO().sessionExists(sessionId);
    if (!sessionExists) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Save the event
    await this.daoFactory.getEventDAO().saveEvent(sessionId, event);
    
    // Update session timestamp
    await this.daoFactory.getSessionDAO().updateSessionTimestamp(sessionId);
  }

  async getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]> {
    await this.ensureInitialized();
    return this.daoFactory.getEventDAO().getSessionEvents(sessionId);
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string; [key: string]: any }> {
    return this.daoFactory.healthCheck();
  }

  /**
   * Get the DAO factory for direct DAO access
   * This is the preferred way to access data operations
   */
  getDAOFactory(): IDAOFactory {
    return this.daoFactory;
  }

  async close(): Promise<void> {
    if (this.daoFactory) {
      try {
        await this.daoFactory.close();
        console.log('SQLite DAO Factory closed successfully');
      } catch (error) {
        console.error('Error closing SQLite DAO Factory:', error);
      } finally {
        this.initialized = false;
      }
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
