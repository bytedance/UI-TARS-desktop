/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import mongoose, { Connection, ConnectOptions } from 'mongoose';
import { AgentEventStream, MongoDBAgentStorageImplementation } from '@tarko/interface';
import { getLogger } from '@tarko/shared-utils';
import { StorageProvider, SessionInfo } from '../types';
import { SessionModel, EventModel, SessionDocument, EventDocument } from './MongoDBSchemas';

const logger = getLogger('MongoDBStorageProvider');

/**
 * MongoDB-based storage provider using Mongoose
 * Provides scalable, document-based storage with clustering support
 * Optimized for handling large amounts of event data with proper indexing
 */
export class MongoDBStorageProvider implements StorageProvider {
  private connection: Connection | null = null;
  private initialized = false;
  private config: MongoDBAgentStorageImplementation;
  public readonly uri?: string;

  constructor(config: MongoDBAgentStorageImplementation) {
    this.config = config;
    this.uri = config.uri;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing MongoDB connection...');

      // Prepare connection options with defaults
      const defaultOptions: ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false, // Disable mongoose buffering
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

      logger.info(`MongoDB connected successfully to database: ${connectionOptions.dbName}`);

      // Test the connection with a simple operation
      if (this.connection?.db) {
        await this.connection.db.admin().ping();
        logger.info('MongoDB ping successful');
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize MongoDB connection:', error);
      throw new Error(
        `MongoDB initialization failed: ${error instanceof Error ? error.message : String(error)}`,
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

    try {
      const SessionModel = this.connection!.model<SessionDocument>('Session');

      const session = new SessionModel({
        _id: sessionData.id,
        createdAt: sessionData.createdAt,
        updatedAt: sessionData.updatedAt,
        workspace: sessionData.workspace,
        metadata: sessionData.metadata,
      });

      await session.save();

      logger.debug(`Session created successfully: ${sessionData.id}`);
      return sessionData;
    } catch (error) {
      if ((error as any).code === 11000) {
        // Duplicate key error
        throw new Error(`Session with ID ${sessionData.id} already exists`);
      }
      logger.error(`Failed to create session ${sessionData.id}:`, error);
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

    try {
      const SessionModel = this.connection!.model<SessionDocument>('Session');

      const updateData: any = {
        updatedAt: Date.now(),
      };

      if (sessionInfo.workspace !== undefined) {
        updateData.workspace = sessionInfo.workspace;
      }

      if (sessionInfo.metadata !== undefined) {
        updateData.metadata = sessionInfo.metadata;
      }

      const updatedSession = await SessionModel.findByIdAndUpdate(sessionId, updateData, {
        new: true,
        runValidators: true,
      }).lean();

      if (!updatedSession) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      logger.debug(`Session updated successfully: ${sessionId}`);

      return {
        id: updatedSession._id,
        createdAt: updatedSession.createdAt,
        updatedAt: updatedSession.updatedAt,
        workspace: updatedSession.workspace,
        metadata: updatedSession.metadata,
      };
    } catch (error) {
      logger.error(`Failed to update session ${sessionId}:`, error);
      throw new Error(
        `Failed to update session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    await this.ensureInitialized();

    try {
      const SessionModel = this.connection!.model<SessionDocument>('Session');

      const session = await SessionModel.findById(sessionId).lean();

      if (!session) {
        return null;
      }

      return {
        id: session._id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        workspace: session.workspace || '',
        metadata: session.metadata,
      };
    } catch (error) {
      logger.error(`Failed to get session ${sessionId}:`, error);
      throw new Error(
        `Failed to get session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getAllSessions(): Promise<SessionInfo[]> {
    await this.ensureInitialized();

    try {
      const SessionModel = this.connection!.model<SessionDocument>('Session');

      const sessions = await SessionModel.find({}).sort({ updatedAt: -1 }).lean();

      return sessions.map((session: SessionDocument) => ({
        id: session._id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        workspace: session.workspace || '',
        metadata: session.metadata,
      }));
    } catch (error) {
      logger.error('Failed to get all sessions:', error);
      throw new Error(
        `Failed to get all sessions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const SessionModel = this.connection!.model<SessionDocument>('Session');
      const EventModel = this.connection!.model<EventDocument>('Event');

      // Check if the session exists before attempting deletion
      const sessionExists = await SessionModel.exists({ _id: sessionId });
      if (!sessionExists) {
        logger.debug(`Session not found: ${sessionId}`);
        return false;
      }

      // Delete all events for this session first
      await EventModel.deleteMany({ sessionId });

      // Delete the session
      const deleteResult = await SessionModel.findByIdAndDelete(sessionId);

      if (deleteResult) {
        logger.debug(`Session deleted successfully: ${sessionId}`);
        return true;
      } else {
        logger.debug(`Session not found during deletion: ${sessionId}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to delete session ${sessionId}:`, error);
      throw new Error(
        `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void> {
    await this.ensureInitialized();

    try {
      const SessionModel = this.connection!.model<SessionDocument>('Session');
      const EventModel = this.connection!.model<EventDocument>('Event');

      // Check if session exists
      const sessionExists = await SessionModel.exists({ _id: sessionId });
      if (!sessionExists) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const timestamp = Date.now();

      // Save the event
      const eventDoc = new EventModel({
        sessionId,
        timestamp,
        eventData: event,
      });

      await eventDoc.save();

      // Update session's updatedAt timestamp
      await SessionModel.findByIdAndUpdate(sessionId, { updatedAt: timestamp });

      logger.debug(`Event saved for session: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to save event for session ${sessionId}:`, error);
      throw new Error(
        `Failed to save event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]> {
    await this.ensureInitialized();

    try {
      const EventModel = this.connection!.model<EventDocument>('Event');

      const events = await EventModel.find({ sessionId }).sort({ timestamp: 1, _id: 1 }).lean();

      return events.map((event: EventDocument) => {
        try {
          return event.eventData;
        } catch (error) {
          logger.error(`Failed to parse event data: ${JSON.stringify(event.eventData)}`);
          return {
            type: 'system',
            message: 'Failed to parse event data',
            timestamp: Date.now(),
          } as AgentEventStream.Event;
        }
      });
    } catch (error) {
      logger.error(`Failed to get events for session ${sessionId}:`, error);
      // Return empty array instead of throwing error to allow sessions to load
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.close();
        logger.debug('MongoDB connection closed successfully');
      } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
      } finally {
        this.connection = null;
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
