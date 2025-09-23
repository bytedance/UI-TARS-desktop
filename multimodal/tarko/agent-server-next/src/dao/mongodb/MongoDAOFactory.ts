/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import mongoose, { Connection, ConnectOptions } from 'mongoose';
import { AgentEventStream, MongoDBAgentStorageImplementation, SessionInfo } from '@tarko/interface';
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
import {
  SessionModel,
  EventModel,
  UserConfigModel,
  SandboxAllocationModel,
} from './MongoDBSchemas';
import { getLogger } from '../../utils/logger';

const logger = getLogger('MongoDAOFactory');

/**
 * MongoDB implementation of IDAOFactory
 * Manages MongoDB connection and provides DAO instances
 */
export class MongoDAOFactory implements IDAOFactory {
  private connection: Connection | null = null;
  private initialized = false;
  private config: MongoDBAgentStorageImplementation;
  
  // DAO instance cache
  private userConfigDAO: IUserConfigDAO | null = null;
  private sessionDAO: ISessionDAO | null = null;
  private eventDAO: IEventDAO | null = null;
  private sandboxAllocationDAO: ISandboxAllocationDAO | null = null;

  constructor(config: MongoDBAgentStorageImplementation) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing MongoDB DAO Factory...');

      // Prepare connection options with defaults
      const defaultOptions: ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      };

      const connectionOptions = {
        ...defaultOptions,
        ...this.config.options,
      };

      this.connection = await mongoose
        .createConnection(this.config.uri, connectionOptions)
        .asPromise();

      // Bind models to this connection
      this.connection.model('Session', SessionModel.schema);
      this.connection.model('Event', EventModel.schema);
      this.connection.model('UserConfig', UserConfigModel.schema);
      this.connection.model('SandboxAllocation', SandboxAllocationModel.schema);

      logger.info(`MongoDB DAO Factory connected successfully to database: ${connectionOptions.dbName}`);

      // Test the connection with a simple operation
      if (this.connection?.db) {
        await this.connection.db.admin().ping();
        logger.info('MongoDB DAO Factory ping successful');
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize MongoDB DAO Factory:', error);
      throw new Error(
        `MongoDB DAO Factory initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  isInitialized(): boolean {
    return this.initialized && this.connection !== null;
  }

  getUserConfigDAO(): IUserConfigDAO {
    this.ensureInitialized();
    
    if (!this.userConfigDAO) {
      this.userConfigDAO = new UserConfigDAO(this.connection!);
    }
    
    return this.userConfigDAO;
  }

  getSessionDAO(): ISessionDAO {
    this.ensureInitialized();
    
    if (!this.sessionDAO) {
      this.sessionDAO = new SessionDAO(this.connection!);
    }
    
    return this.sessionDAO;
  }

  getEventDAO(): IEventDAO {
    this.ensureInitialized();
    
    if (!this.eventDAO) {
      this.eventDAO = new EventDAO(this.connection!);
    }
    
    return this.eventDAO;
  }

  getSandboxAllocationDAO(): ISandboxAllocationDAO {
    this.ensureInitialized();
    
    if (!this.sandboxAllocationDAO) {
      this.sandboxAllocationDAO = new SandboxAllocationDAO(this.connection!);
    }
    
    return this.sandboxAllocationDAO;
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string; [key: string]: any }> {
    try {
      if (!this.connection) {
        return { healthy: false, message: 'Not connected to MongoDB' };
      }

      // Simple ping to test connection
      await this.connection!.db?.admin().ping();

      return {
        healthy: true,
        message: 'MongoDB DAO Factory connection is healthy',
        database: this.connection!.db?.databaseName,
        readyState: this.connection!.readyState,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `MongoDB DAO Factory health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.close();
        logger.info('MongoDB DAO Factory connection closed successfully');
      } catch (error) {
        logger.error('Error closing MongoDB DAO Factory connection:', error);
      } finally {
        this.connection = null;
        this.initialized = false;
        
        // Clear DAO instances
        this.userConfigDAO = null;
        this.sessionDAO = null;
        this.eventDAO = null;
        this.sandboxAllocationDAO = null;
      }
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
    if (!this.initialized || !this.connection) {
      throw new Error('MongoDB DAO Factory not initialized. Call initialize() first.');
    }
  }
}