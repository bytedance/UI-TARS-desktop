/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import { AgentEventStream } from '@tarko/interface';
import { IEventDAO } from '../interfaces/IEventDAO';

// Row types for SQLite results
interface EventRow {
  eventData: string; // JSON string
}

interface CountResult {
  count: number;
}

interface ExistsResult {
  existsFlag: number;
}

/**
 * SQLite implementation of IEventDAO
 */
export class EventDAO implements IEventDAO {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void> {
    try {
      const timestamp = Date.now();
      const eventData = JSON.stringify(event);

      const stmt = this.db.prepare(`
        INSERT INTO events (sessionId, timestamp, eventData)
        VALUES (?, ?, ?)
      `);

      stmt.run(sessionId, timestamp, eventData);
    } catch (error) {
      console.error(`Failed to save event for session ${sessionId}:`, error);
      throw new Error(
        `Failed to save event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT eventData
        FROM events
        WHERE sessionId = ?
        ORDER BY timestamp ASC, id ASC
      `);

      const rows = stmt.all(sessionId) as unknown as EventRow[];

      // Return empty array if no events found
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
      return [];
    }
  }

  async getSessionEventsInRange(
    sessionId: string,
    startTime: number,
    endTime: number,
  ): Promise<AgentEventStream.Event[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT eventData
        FROM events
        WHERE sessionId = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC, id ASC
      `);

      const rows = stmt.all(sessionId, startTime, endTime) as unknown as EventRow[];

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
      console.error(`Failed to get events in range for session ${sessionId}:`, error);
      return [];
    }
  }

  async getSessionEventsPaginated(
    sessionId: string,
    offset: number,
    limit: number,
  ): Promise<AgentEventStream.Event[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT eventData
        FROM events
        WHERE sessionId = ?
        ORDER BY timestamp ASC, id ASC
        LIMIT ? OFFSET ?
      `);

      const rows = stmt.all(sessionId, limit, offset) as unknown as EventRow[];

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
      console.error(`Failed to get paginated events for session ${sessionId}:`, error);
      return [];
    }
  }

  async deleteSessionEvents(sessionId: string): Promise<number> {
    try {
      const stmt = this.db.prepare('DELETE FROM events WHERE sessionId = ?');
      const result = stmt.run(sessionId);
      return Number(result.changes) || 0;
    } catch (error) {
      console.error(`Failed to delete events for session ${sessionId}:`, error);
      throw new Error(
        `Failed to delete session events: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionEventCount(sessionId: string): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM events
        WHERE sessionId = ?
      `);

      const result = stmt.get(sessionId) as CountResult | undefined;
      return result?.count || 0;
    } catch (error) {
      console.error(`Failed to get event count for session ${sessionId}:`, error);
      throw new Error(
        `Failed to get event count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteEventsOlderThan(timestamp: number): Promise<number> {
    try {
      const stmt = this.db.prepare('DELETE FROM events WHERE timestamp < ?');
      const result = stmt.run(timestamp);
      return Number(result.changes) || 0;
    } catch (error) {
      console.error(`Failed to delete old events:`, error);
      throw new Error(
        `Failed to delete old events: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}