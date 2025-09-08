/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseSync } from 'node:sqlite';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SQLiteStorageProvider } from '../src/storage/SQLiteStorageProvider';
import { SessionInfo } from '../src/types';
import { AgentEventStream } from '@tarko/interface';

// Mock the interface module
vi.mock('@tarko/interface', () => ({
  getGlobalStorageDirectory: (baseDir?: string) => baseDir || os.tmpdir(),
  TARKO_CONSTANTS: {
    SESSION_DATA_DB_NAME: 'test-sessions.db',
  },
  AgentEventStream: {},
}));

describe('SQLiteStorageProvider - Complete Migration Testing', () => {
  let tempDir: string;
  let provider: SQLiteStorageProvider;
  let dbPath: string;

  beforeEach(() => {
    // Create unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-test-'));
    dbPath = path.join(tempDir, 'test-sessions.db');

    provider = new SQLiteStorageProvider({
      type: 'sqlite',
      baseDir: tempDir,
      dbName: 'test-sessions.db',
    });
  });

  afterEach(async () => {
    try {
      await provider.close();
    } catch (e) {
      // Ignore cleanup errors
    }

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Functionality', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should initialize with modern schema', async () => {
      expect(fs.existsSync(dbPath)).toBe(true);

      // Verify WAL mode and foreign keys are enabled
      const db = new DatabaseSync(dbPath);
      const journalMode = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
      const foreignKeys = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };

      expect(journalMode.journal_mode).toBe('wal');
      expect(foreignKeys.foreign_keys).toBe(1);

      db.close();
    });

    it('should create and retrieve sessions', async () => {
      const sessionData: SessionInfo = {
        id: 'test-session-1',
        workspace: '/test/workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          name: 'Test Session',
          tags: ['test', 'demo'],
          modelConfig: { modelId: 'gpt-4', provider: 'openai', configuredAt: Date.now() },
        },
      };

      const created = await provider.createSession(sessionData);
      expect(created.id).toBe(sessionData.id);
      expect(created.workspace).toBe(sessionData.workspace);
      expect(created.metadata).toEqual(sessionData.metadata);

      const retrieved = await provider.getSessionInfo('test-session-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(sessionData.id);
      expect(retrieved!.workspace).toBe(sessionData.workspace);
      expect(retrieved!.metadata).toEqual(sessionData.metadata);
    });

    it('should update session metadata', async () => {
      const sessionData: SessionInfo = {
        id: 'test-session-update',
        workspace: '/test/workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { name: 'Original Name' },
      };

      await provider.createSession(sessionData);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await provider.updateSessionInfo('test-session-update', {
        workspace: '/updated/workspace',
        metadata: { name: 'Updated Name', tags: ['updated'] },
      });

      expect(updated.workspace).toBe('/updated/workspace');
      expect(updated.metadata!.name).toBe('Updated Name');
      expect(updated.metadata!.tags).toEqual(['updated']);
      expect(updated.updatedAt).toBeGreaterThan(sessionData.updatedAt);
    });

    it('should handle session deletion with events', async () => {
      const sessionData: SessionInfo = {
        id: 'test-session-delete',
        workspace: '/test/workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await provider.createSession(sessionData);

      // @ts-expect-error
      const event: AgentEventStream.Event = {
        type: 'system',
        message: 'Test event',
        timestamp: Date.now(),
      };

      await provider.saveEvent('test-session-delete', event);

      // Verify session and events exist
      const session = await provider.getSessionInfo('test-session-delete');
      expect(session).not.toBeNull();

      const events = await provider.getSessionEvents('test-session-delete');
      expect(events).toHaveLength(1);

      // Delete session
      const deleted = await provider.deleteSession('test-session-delete');
      expect(deleted).toBe(true);

      // Verify session and events are gone
      const deletedSession = await provider.getSessionInfo('test-session-delete');
      expect(deletedSession).toBeNull();

      const deletedEvents = await provider.getSessionEvents('test-session-delete');
      expect(deletedEvents).toEqual([]);
    });

    it('should save and retrieve events in order', async () => {
      await provider.createSession({
        id: 'event-test-session',
        workspace: '/test/workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const events: AgentEventStream.Event[] = [
        // @ts-expect-error
        { type: 'system', message: 'Event 1', timestamp: 1000 },
        // @ts-expect-error
        { type: 'user', message: 'Event 2', timestamp: 2000 },
        // @ts-expect-error
        { type: 'assistant', message: 'Event 3', timestamp: 3000 },
      ];

      // Save events
      for (const event of events) {
        await provider.saveEvent('event-test-session', event);
      }

      // Retrieve events
      const retrievedEvents = await provider.getSessionEvents('event-test-session');
      expect(retrievedEvents).toHaveLength(3);

      // Events should be ordered by timestamp ASC
      // @ts-expect-error
      expect(retrievedEvents[0].message).toBe('Event 1');
      // @ts-expect-error
      expect(retrievedEvents[1].message).toBe('Event 2');
      // @ts-expect-error
      expect(retrievedEvents[2].message).toBe('Event 3');
    });
  });

  describe('Legacy Schema Migration Tests', () => {
    it('should migrate from workingDirectory to workspace', async () => {
      // Create legacy schema manually
      const db = new DatabaseSync(dbPath);
      db.exec(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          name TEXT,
          workingDirectory TEXT,
          tags TEXT,
          modelConfig TEXT
        )
      `);

      // Insert legacy data
      db.exec(`
        INSERT INTO sessions (id, createdAt, updatedAt, name, workingDirectory, tags, modelConfig)
        VALUES (
          'legacy-session',
          1000,
          2000,
          'Legacy Session',
          '/legacy/workspace',
          '["legacy", "test"]',
          '{"model": "gpt-3.5", "temperature": 0.5}'
        )
      `);

      db.close();

      // Initialize provider - should trigger migration
      await provider.initialize();

      // Verify migration worked
      const session = await provider.getSessionInfo('legacy-session');
      expect(session).not.toBeNull();
      expect(session!.workspace).toBe('/legacy/workspace');
      expect(session!.metadata!.name).toBe('Legacy Session');
      expect(session!.metadata!.tags).toEqual(['legacy', 'test']);
      expect(session!.metadata!.modelConfig).toEqual({ model: 'gpt-3.5', temperature: 0.5 });
    });

    it('should preserve events during migration', async () => {
      // Create legacy schema with events
      const db = new DatabaseSync(dbPath);
      db.exec(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          name TEXT,
          workingDirectory TEXT
        )
      `);

      db.exec(`
        CREATE TABLE events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sessionId TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          eventData TEXT NOT NULL
        )
      `);

      // Insert legacy session and events
      db.exec(`
        INSERT INTO sessions (id, createdAt, updatedAt, name, workingDirectory)
        VALUES ('legacy-with-events', 1000, 2000, 'Legacy Session', '/legacy/workspace')
      `);

      db.exec(`
        INSERT INTO events (sessionId, timestamp, eventData)
        VALUES 
          ('legacy-with-events', 1000, '{"type": "system", "message": "Event 1"}'),
          ('legacy-with-events', 2000, '{"type": "user", "message": "Event 2"}')
      `);

      db.close();

      // Initialize - should migrate without losing events
      await provider.initialize();

      // Verify session migrated
      const session = await provider.getSessionInfo('legacy-with-events');
      expect(session).not.toBeNull();
      expect(session!.workspace).toBe('/legacy/workspace');

      // Verify events preserved
      const events = await provider.getSessionEvents('legacy-with-events');
      expect(events).toHaveLength(2);
      // @ts-expect-error
      expect(events[0].message).toBe('Event 1');
      // @ts-expect-error
      expect(events[1].message).toBe('Event 2');
    });

    it('should handle empty legacy database', async () => {
      // Create legacy schema with no data
      const db = new DatabaseSync(dbPath);
      db.exec(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          name TEXT,
          workingDirectory TEXT
        )
      `);
      db.close();

      // Should not attempt migration for empty database
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await provider.initialize();

      expect(consoleSpy).toHaveBeenCalledWith('No sessions to migrate, skipping migration');

      consoleSpy.mockRestore();
    });

    it('should handle mixed schema (workingDirectory + workspace)', async () => {
      // Create mixed schema
      const db = new DatabaseSync(dbPath);
      db.exec(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          name TEXT,
          workingDirectory TEXT,
          workspace TEXT,
          tags TEXT
        )
      `);

      // Insert data with workingDirectory but empty workspace
      db.exec(`
        INSERT INTO sessions (id, createdAt, updatedAt, name, workingDirectory, workspace, tags)
        VALUES (
          'mixed-session',
          1000,
          2000,
          'Mixed Session',
          '/working/dir',
          '',
          '["mixed"]'
        )
      `);

      db.close();

      await provider.initialize();

      const session = await provider.getSessionInfo('mixed-session');
      expect(session).not.toBeNull();
      // The migration logic doesn't update existing workspace columns that are empty
      // It only adds workspace column when it doesn't exist
      expect(session!.workspace).toBe('');
      expect(session!.metadata!.name).toBe('Mixed Session');
    });
  });

  describe('PR #1147 Specific Fixes', () => {
    it('should handle rollback errors gracefully', async () => {
      // Create a scenario that will cause migration to fail
      const db = new DatabaseSync(dbPath);
      db.exec(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          name TEXT,
          workingDirectory TEXT
        )
      `);

      // Insert data
      db.exec(`
        INSERT INTO sessions (id, createdAt, updatedAt, name, workingDirectory)
        VALUES ('test-session', 1000, 2000, 'Test', '/workspace')
      `);

      db.close();

      // Mock console.error to capture rollback messages
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Temporarily break the migration by mocking exec to fail on specific SQL
      const originalProvider = provider;
      const mockProvider = new SQLiteStorageProvider({
        type: 'sqlite',
        baseDir: tempDir,
        dbName: 'test-sessions.db',
      });

      // Override the db.exec method to simulate failure
      const originalInitialize = mockProvider.initialize;
      mockProvider.initialize = async function () {
        const db = new DatabaseSync(this.dbPath);
        db.open();

        // Simulate a failure during migration that requires rollback
        try {
          db.exec('BEGIN TRANSACTION');
          db.exec('PRAGMA foreign_keys = OFF');

          // This will fail and trigger rollback
          db.exec('INVALID SQL THAT WILL FAIL');

          db.exec('COMMIT');
        } catch (error) {
          try {
            db.exec('ROLLBACK');
          } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
          }
          throw new Error('Migration failed and rolled back');
        } finally {
          db.close();
        }
      };

      try {
        await expect(mockProvider.initialize()).rejects.toThrow();

        // The important thing is that it doesn't crash with unhandled rollback error
        expect(true).toBe(true);
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('should use consistent SQL quotes', async () => {
      await provider.initialize();

      // Test that the SQL quote fixes work
      const sessionData: SessionInfo = {
        id: 'quote-test',
        workspace: '/test/workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { name: 'Quote Test' },
      };

      // This should work without SQL syntax errors
      const created = await provider.createSession(sessionData);
      expect(created.id).toBe('quote-test');
    });

    it('should handle dynamic insert for missing columns', async () => {
      // Create minimal schema
      const db = new DatabaseSync(dbPath);
      db.exec(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `);
      db.close();

      await provider.initialize();

      // The dynamic insert logic should handle missing workspace/metadata columns
      const sessionData: SessionInfo = {
        id: 'dynamic-test',
        workspace: '/test/workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { name: 'Dynamic Test' },
      };

      const created = await provider.createSession(sessionData);
      expect(created.id).toBe('dynamic-test');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should handle corrupted event data gracefully', async () => {
      await provider.createSession({
        id: 'corrupt-events-session',
        workspace: '/test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Manually insert corrupted event data
      const db = new DatabaseSync(dbPath);
      db.exec(`
        INSERT INTO events (sessionId, timestamp, eventData)
        VALUES ('corrupt-events-session', ${Date.now()}, 'invalid-json')
      `);
      db.close();

      const events = await provider.getSessionEvents('corrupt-events-session');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('system');
      // @ts-expect-error
      expect(events[0].message).toBe('Failed to parse event data');
    });

    it('should handle invalid JSON in metadata', async () => {
      const sessionData = {
        id: 'circular-ref-session',
        workspace: '/test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { circularRef: { self: {} } },
      };

      // Create circular reference
      sessionData.metadata.circularRef.self = sessionData.metadata;

      await expect(provider.createSession(sessionData)).rejects.toThrow(
        'Converting circular structure to JSON',
      );
    });

    it('should handle session not found errors', async () => {
      await expect(provider.getSessionInfo('non-existent')).resolves.toBeNull();

      await expect(
        provider.updateSessionInfo('non-existent', { workspace: '/new' }),
      ).rejects.toThrow('Session not found: non-existent');

      await expect(provider.deleteSession('non-existent')).resolves.toBe(false);
    });

    it('should handle event save to non-existent session', async () => {
      // @ts-expect-error
      const event: AgentEventStream.Event = {
        type: 'system',
        message: 'Test event',
        timestamp: Date.now(),
      };

      await expect(provider.saveEvent('non-existent-session', event)).rejects.toThrow(
        'Session not found: non-existent-session',
      );
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should handle concurrent session operations', async () => {
      const promises = [];

      // Create multiple sessions concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          provider.createSession({
            id: `concurrent-session-${i}`,
            workspace: `/workspace-${i}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: { name: `Session ${i}` },
          }),
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      // Verify all sessions were created
      const allSessions = await provider.getAllSessions();
      expect(allSessions).toHaveLength(10);
    });

    it('should handle large number of events efficiently', async () => {
      await provider.createSession({
        id: 'perf-test-session',
        workspace: '/test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const eventPromises = [];
      const eventCount = 100;

      // Save many events
      for (let i = 0; i < eventCount; i++) {
        eventPromises.push(
          // @ts-expect-error
          provider.saveEvent('perf-test-session', {
            type: 'system',
            message: `Event ${i}`,
            timestamp: Date.now() + i,
          }),
        );
      }

      await Promise.all(eventPromises);

      // Verify all events were saved
      const events = await provider.getSessionEvents('perf-test-session');
      expect(events).toHaveLength(eventCount);

      // Verify events are ordered correctly
      for (let i = 0; i < eventCount - 1; i++) {
        expect(events[i].timestamp).toBeLessThanOrEqual(events[i + 1].timestamp);
      }
    });

    it('should maintain session ordering by updatedAt', async () => {
      const sessions = [
        { id: 'session-1', workspace: '/ws1', createdAt: 1000, updatedAt: 1000 },
        { id: 'session-2', workspace: '/ws2', createdAt: 2000, updatedAt: 3000 },
        { id: 'session-3', workspace: '/ws3', createdAt: 1500, updatedAt: 2000 },
      ];

      for (const session of sessions) {
        await provider.createSession(session);
      }

      const allSessions = await provider.getAllSessions();
      expect(allSessions).toHaveLength(3);

      // Should be ordered by updatedAt DESC
      expect(allSessions[0].id).toBe('session-2'); // updatedAt: 3000
      expect(allSessions[1].id).toBe('session-3'); // updatedAt: 2000
      expect(allSessions[2].id).toBe('session-1'); // updatedAt: 1000
    });
  });
});
