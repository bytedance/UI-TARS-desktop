/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import { ISandboxAllocationDAO, SandboxAllocation } from '../interfaces/ISandboxAllocationDAO';

// Row types for SQLite results
interface SandboxAllocationRow {
  sandboxId: string;
  sandboxUrl: string;
  userId?: string;
  sessionId?: string;
  allocationStrategy: 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive';
  createdAt: number;
  lastUsedAt: number;
  isActive: number; // SQLite boolean as integer
}

/**
 * SQLite implementation of ISandboxAllocationDAO
 */
export class SandboxAllocationDAO implements ISandboxAllocationDAO {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  private rowToSandboxAllocation(row: SandboxAllocationRow): SandboxAllocation {
    return {
      sandboxId: row.sandboxId,
      sandboxUrl: row.sandboxUrl,
      userId: row.userId,
      sessionId: row.sessionId,
      allocationStrategy: row.allocationStrategy,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      isActive: Boolean(row.isActive),
    };
  }

  async createSandboxAllocation(
    allocation: Omit<SandboxAllocation, 'createdAt' | 'lastUsedAt'>,
  ): Promise<SandboxAllocation> {
    try {
      const now = Date.now();

      const stmt = this.db.prepare(`
        INSERT INTO sandbox_allocations (
          sandboxId, sandboxUrl, userId, sessionId, allocationStrategy, 
          createdAt, lastUsedAt, isActive
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        allocation.sandboxId,
        allocation.sandboxUrl,
        allocation.userId || null,
        allocation.sessionId || null,
        allocation.allocationStrategy,
        now,
        now,
        allocation.isActive ? 1 : 0,
      );

      return {
        ...allocation,
        createdAt: now,
        lastUsedAt: now,
      };
    } catch (error) {
      console.error(`Failed to create sandbox allocation ${allocation.sandboxId}:`, error);
      if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error(`Sandbox allocation with ID ${allocation.sandboxId} already exists`);
      }
      throw new Error('Failed to create sandbox allocation');
    }
  }

  async getSandboxAllocation(sandboxId: string): Promise<SandboxAllocation | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT sandboxId, sandboxUrl, userId, sessionId, allocationStrategy,
               createdAt, lastUsedAt, isActive
        FROM sandbox_allocations
        WHERE sandboxId = ?
      `);

      const row = stmt.get(sandboxId) as SandboxAllocationRow | undefined;

      if (!row) {
        return null;
      }

      return this.rowToSandboxAllocation(row);
    } catch (error) {
      console.error(`Failed to get sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to get sandbox allocation');
    }
  }

  async getUserSandboxAllocations(userId: string): Promise<SandboxAllocation[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT sandboxId, sandboxUrl, userId, sessionId, allocationStrategy,
               createdAt, lastUsedAt, isActive
        FROM sandbox_allocations
        WHERE userId = ? AND isActive = 1
      `);

      const rows = stmt.all(userId) as unknown as SandboxAllocationRow[];

      return rows.map((row) => this.rowToSandboxAllocation(row));
    } catch (error) {
      console.error(`Failed to get user sandbox allocations for ${userId}:`, error);
      throw new Error('Failed to get user sandbox allocations');
    }
  }

  async getSessionSandboxAllocation(sessionId: string): Promise<SandboxAllocation | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT sandboxId, sandboxUrl, userId, sessionId, allocationStrategy,
               createdAt, lastUsedAt, isActive
        FROM sandbox_allocations
        WHERE sessionId = ? AND isActive = 1
      `);

      const row = stmt.get(sessionId) as SandboxAllocationRow | undefined;

      if (!row) {
        return null;
      }

      return this.rowToSandboxAllocation(row);
    } catch (error) {
      console.error(`Failed to get session sandbox allocation for ${sessionId}:`, error);
      throw new Error('Failed to get session sandbox allocation');
    }
  }

  async getAvailableSandboxAllocations(
    strategy: 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive',
    userId?: string,
  ): Promise<SandboxAllocation[]> {
    try {
      let query = `
        SELECT sandboxId, sandboxUrl, userId, sessionId, allocationStrategy,
               createdAt, lastUsedAt, isActive
        FROM sandbox_allocations
        WHERE allocationStrategy = ? AND isActive = 1
      `;
      const params: any[] = [strategy];

      // For user-exclusive strategy, filter by userId if provided
      if (strategy === 'User-Exclusive' && userId) {
        query += ' AND userId = ?';
        params.push(userId);
      }

      // For shared pool, we might want to exclude user-specific allocations
      if (strategy === 'Shared-Pool') {
        if (userId) {
          query += ' AND (userId IS NULL OR userId = ?)';
          params.push(userId);
        } else {
          query += ' AND userId IS NULL';
        }
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as unknown as SandboxAllocationRow[];

      return rows.map((row) => this.rowToSandboxAllocation(row));
    } catch (error) {
      console.error(`Failed to get available sandbox allocations for strategy ${strategy}:`, error);
      throw new Error('Failed to get available sandbox allocations');
    }
  }

  async updateSandboxLastUsed(sandboxId: string): Promise<void> {
    try {
      const now = Date.now();

      const stmt = this.db.prepare(`
        UPDATE sandbox_allocations
        SET lastUsedAt = ?
        WHERE sandboxId = ?
      `);

      stmt.run(now, sandboxId);
    } catch (error) {
      console.error(`Failed to update sandbox last used time for ${sandboxId}:`, error);
      throw new Error('Failed to update sandbox last used time');
    }
  }

  async deactivateSandboxAllocation(sandboxId: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        UPDATE sandbox_allocations
        SET isActive = 0
        WHERE sandboxId = ?
      `);

      const result = stmt.run(sandboxId);
      return result.changes > 0;
    } catch (error) {
      console.error(`Failed to deactivate sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to deactivate sandbox allocation');
    }
  }

  async activateSandboxAllocation(sandboxId: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        UPDATE sandbox_allocations
        SET isActive = 1
        WHERE sandboxId = ?
      `);

      const result = stmt.run(sandboxId);
      return result.changes > 0;
    } catch (error) {
      console.error(`Failed to activate sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to activate sandbox allocation');
    }
  }

  async deleteSandboxAllocation(sandboxId: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM sandbox_allocations WHERE sandboxId = ?');
      const result = stmt.run(sandboxId);
      return result.changes > 0;
    } catch (error) {
      console.error(`Failed to delete sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to delete sandbox allocation');
    }
  }

  async getUnusedSandboxAllocations(sinceTime: number): Promise<SandboxAllocation[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT sandboxId, sandboxUrl, userId, sessionId, allocationStrategy,
               createdAt, lastUsedAt, isActive
        FROM sandbox_allocations
        WHERE lastUsedAt < ? AND isActive = 1
      `);

      const rows = stmt.all(sinceTime) as unknown as SandboxAllocationRow[];

      return rows.map((row) => this.rowToSandboxAllocation(row));
    } catch (error) {
      console.error(`Failed to get unused sandbox allocations:`, error);
      throw new Error('Failed to get unused sandbox allocations');
    }
  }

  async getInactiveSandboxAllocations(): Promise<SandboxAllocation[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT sandboxId, sandboxUrl, userId, sessionId, allocationStrategy,
               createdAt, lastUsedAt, isActive
        FROM sandbox_allocations
        WHERE isActive = 0
      `);

      const rows = stmt.all() as unknown as SandboxAllocationRow[];

      return rows.map((row) => this.rowToSandboxAllocation(row));
    } catch (error) {
      console.error(`Failed to get inactive sandbox allocations:`, error);
      throw new Error('Failed to get inactive sandbox allocations');
    }
  }

  async updateSandboxAllocation(
    sandboxId: string,
    updates: Partial<Pick<SandboxAllocation, 'sandboxUrl' | 'userId' | 'sessionId' | 'allocationStrategy' | 'isActive'>>,
  ): Promise<SandboxAllocation | null> {
    try {
      const params: any[] = [];
      const setClauses: string[] = [];

      if (updates.sandboxUrl !== undefined) {
        setClauses.push('sandboxUrl = ?');
        params.push(updates.sandboxUrl);
      }

      if (updates.userId !== undefined) {
        setClauses.push('userId = ?');
        params.push(updates.userId);
      }

      if (updates.sessionId !== undefined) {
        setClauses.push('sessionId = ?');
        params.push(updates.sessionId);
      }

      if (updates.allocationStrategy !== undefined) {
        setClauses.push('allocationStrategy = ?');
        params.push(updates.allocationStrategy);
      }

      if (updates.isActive !== undefined) {
        setClauses.push('isActive = ?');
        params.push(updates.isActive ? 1 : 0);
      }

      if (setClauses.length === 0) {
        // No updates to apply
        return this.getSandboxAllocation(sandboxId);
      }

      params.push(sandboxId);

      const updateQuery = `
        UPDATE sandbox_allocations
        SET ${setClauses.join(', ')}
        WHERE sandboxId = ?
      `;

      const stmt = this.db.prepare(updateQuery);
      const result = stmt.run(...params);

      if (result.changes === 0) {
        return null;
      }

      return this.getSandboxAllocation(sandboxId);
    } catch (error) {
      console.error(`Failed to update sandbox allocation ${sandboxId}:`, error);
      throw new Error('Failed to update sandbox allocation');
    }
  }
}