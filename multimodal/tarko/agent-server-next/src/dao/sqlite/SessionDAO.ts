/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import { SessionInfo } from '@tarko/interface';
import { ISessionDAO } from '../interfaces/ISessionDAO';

// Row types for SQLite results
interface SessionRow {
  id: string;
  createdAt: number;
  updatedAt: number;
  workspace: string;
  userId?: string;
  metadata: string | null; // JSON string
}

interface ExistsResult {
  existsFlag: number;
}

/**
 * SQLite implementation of ISessionDAO
 */
export class SessionDAO implements ISessionDAO {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async createSession(metadata: SessionInfo): Promise<SessionInfo> {
    const sessionData = {
      ...metadata,
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: metadata.updatedAt || Date.now(),
    };

    const metadataJson = sessionData.metadata ? JSON.stringify(sessionData.metadata) : null;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, createdAt, updatedAt, workspace, userId, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

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
      if ((error as any).code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw new Error(`Session with ID ${sessionData.id} already exists`);
      }
      throw new Error(
        `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateSessionInfo(
    sessionId: string,
    sessionInfo: Partial<Omit<SessionInfo, 'id'>>,
  ): Promise<SessionInfo> {
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

      const stmt = this.db.prepare(updateQuery);
      stmt.run(...params);

      return updatedSession;
    } catch (error) {
      console.error(`Failed to update session ${sessionId}:`, error);
      throw new Error(
        `Failed to update session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
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
    try {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
      const result = stmt.run(sessionId);

      return result.changes > 0;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
      throw new Error(
        `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        SELECT 1 as existsFlag FROM sessions WHERE id = ?
      `);

      const result = stmt.get(sessionId) as ExistsResult | undefined;
      return result !== undefined && result.existsFlag === 1;
    } catch (error) {
      console.error(`Failed to check session existence ${sessionId}:`, error);
      throw new Error(
        `Failed to check session existence: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateSessionTimestamp(sessionId: string): Promise<void> {
    try {
      const timestamp = Date.now();
      const stmt = this.db.prepare(`
        UPDATE sessions SET updatedAt = ? WHERE id = ?
      `);

      stmt.run(timestamp, sessionId);
    } catch (error) {
      console.error(`Failed to update session timestamp ${sessionId}:`, error);
      throw new Error(
        `Failed to update session timestamp: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}