/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Model } from 'mongoose';
import { AgentEventStream, MongoDBAgentStorageImplementation, SessionInfo } from '@tarko/interface';
import { getLogger } from '@tarko/shared-utils';
import { StorageProvider } from '../types';
import { UserConfigDocument, SandboxAllocationDocument } from './MongoDBSchemas';
import { MongoDAOFactory } from '../../dao/mongodb/MongoDAOFactory';
import { IDAOFactory } from '../../dao/interfaces/IDAOFactory';

const logger = getLogger('MongoDBStorageProvider');

/**
 * MongoDB-based storage provider using Mongoose
 * Provides scalable, document-based storage with clustering support
 * Optimized for handling large amounts of event data with proper indexing
 *
 */
export class MongoDBStorageProvider implements StorageProvider {
  private daoFactory: MongoDAOFactory;
  private initialized = false;
  public readonly uri?: string;

  constructor(config: MongoDBAgentStorageImplementation) {
    this.uri = config.uri;
    this.daoFactory = new MongoDAOFactory(config);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing MongoDB StorageProvider with DAO factory...');

      // Initialize the DAO factory, which handles all connection setup
      await this.daoFactory.initialize();

      this.initialized = true;
      logger.info('MongoDB StorageProvider initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MongoDB StorageProvider:', error);
      throw new Error(
        `MongoDB StorageProvider initialization failed: ${error instanceof Error ? error.message : String(error)}`,
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
        logger.debug('MongoDB DAO Factory closed successfully');
      } catch (error) {
        logger.error('Error closing MongoDB DAO Factory:', error);
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
