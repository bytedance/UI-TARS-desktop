/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Connection, Model } from 'mongoose';
import { SessionInfo } from '@tarko/interface';
import { ISessionDAO } from '../interfaces/ISessionDAO';
import { SessionDocument } from './MongoDBSchemas';
import { getLogger } from '../../utils/logger';
import { ILogger } from '../../types';


/**
 * MongoDB implementation of ISessionDAO
 */
export class SessionDAO implements ISessionDAO {
  private connection: Connection;
  private logger: ILogger

  constructor(connection: Connection) {
    this.connection = connection;
    this.logger = getLogger('SessionDAO');
  }

  private getSessionModel(): Model<SessionDocument> {
    return this.connection.model<SessionDocument>('Session');
  }

  async createSession(metadata: SessionInfo): Promise<SessionInfo> {
    const sessionData = {
      ...metadata,
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: metadata.updatedAt || Date.now(),
    };

    try {
      const SessionModel = this.getSessionModel();

      const session = new SessionModel({
        _id: sessionData.id,
        createdAt: sessionData.createdAt,
        updatedAt: sessionData.updatedAt,
        workspace: sessionData.workspace,
        userId: sessionData.userId,
        metadata: sessionData.metadata,
      });

      await session.save();

      this.logger.info(`Session created successfully: ${sessionData.id}`);
      return sessionData;
    } catch (error) {
      if ((error as any).code === 11000) {
        throw new Error(`Session with ID ${sessionData.id} already exists`);
      }
      this.logger.error(`Failed to create session ${sessionData.id}:`, error);
      throw new Error(
        `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateSessionInfo(
    sessionId: string,
    sessionInfo: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo> {
    try {
      const SessionModel = this.getSessionModel();

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

      this.logger.info(`Session updated successfully: ${sessionId}`);

      return {
        id: updatedSession._id,
        createdAt: updatedSession.createdAt,
        updatedAt: updatedSession.updatedAt,
        workspace: updatedSession.workspace,
        userId: updatedSession.userId,
        metadata: updatedSession.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to update session ${sessionId}:`, error);
      throw new Error(
        `Failed to update session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    try {
      const SessionModel = this.getSessionModel();

      const session = await SessionModel.findById(sessionId).lean();

      if (!session) {
        return null;
      }

      return {
        id: session._id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        workspace: session.workspace || '',
        userId: session.userId,
        metadata: session.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}:`, error);
      throw new Error(
        `Failed to get session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getAllSessions(): Promise<SessionInfo[]> {
    try {
      const SessionModel = this.getSessionModel();

      const sessions = await SessionModel.find({}).sort({ updatedAt: -1 }).lean();

      return sessions.map((session: SessionDocument) => ({
        id: session._id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        workspace: session.workspace || '',
        userId: session.userId,
        metadata: session.metadata,
      }));
    } catch (error) {
      this.logger.error('Failed to get all sessions:', error);
      throw new Error(
        `Failed to get all sessions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const SessionModel = this.getSessionModel();

      const sessions = await SessionModel.find({
        userId,
      })
        .sort({ updatedAt: -1 })
        .lean();

      return sessions.map((session: SessionDocument) => ({
        id: session._id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        workspace: session.workspace || '',
        metadata: session.metadata,
        userId: session.userId,
      }));
    } catch (error) {
      this.logger.error(`Failed to get user sessions for ${userId}:`, error);
      throw new Error(
        `Failed to get user sessions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const SessionModel = this.getSessionModel();

      const sessionExists = await SessionModel.exists({ _id: sessionId });
      if (!sessionExists) {
        this.logger.info(`Session not found: ${sessionId}`);
        return false;
      }

      const deleteResult = await SessionModel.findByIdAndDelete(sessionId);

      if (deleteResult) {
        this.logger.info(`Session deleted successfully: ${sessionId}`);
        return true;
      } else {
        this.logger.info(`Session not found during deletion: ${sessionId}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to delete session ${sessionId}:`, error);
      throw new Error(
        `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const SessionModel = this.getSessionModel();
      const exists = await SessionModel.exists({ _id: sessionId });
      return exists !== null;
    } catch (error) {
      this.logger.error(`Failed to check session existence ${sessionId}:`, error);
      throw new Error(
        `Failed to check session existence: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateSessionTimestamp(sessionId: string): Promise<void> {
    try {
      const SessionModel = this.getSessionModel();
      const timestamp = Date.now();

      await SessionModel.findByIdAndUpdate(sessionId, { updatedAt: timestamp });
      this.logger.debug(`Session timestamp updated: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to update session timestamp ${sessionId}:`, error);
      throw new Error(
        `Failed to update session timestamp: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}