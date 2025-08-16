/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentSession } from '../src/core/AgentSession';
import { AgentServer } from '../src/server';
import { AgentAppConfig, LogLevel } from '@tarko/interface';
import { MockAgent } from './mocks/MockAgent';
import { MockAgioProvider } from './mocks/MockAgioProvider';

describe('AgentSession Debug Logging', () => {
  let mockServer: Partial<AgentServer>;
  let session: AgentSession;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const createMockServer = (isDebug: boolean): Partial<AgentServer> => ({
    isDebug,
    isExclusive: true,
    appConfig: {
      agent: 'mock-agent',
      workspace: '/tmp/test',
      logLevel: isDebug ? LogLevel.DEBUG : LogLevel.INFO,
      model: {
        provider: 'openai',
        id: 'gpt-4',
        providers: [{ name: 'openai', models: ['gpt-4'] }],
      },
    } as AgentAppConfig,
    setRunningSession: vi.fn(),
    clearRunningSession: vi.fn(),
    createAgentWithSessionModel: vi.fn().mockReturnValue(new MockAgent({} as any)),
    getCurrentWorkspace: vi.fn().mockReturnValue('/tmp/test'),
    storageProvider: null,
  });

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    if (session) {
      session.cleanup();
    }
  });

  describe('Debug mode enabled', () => {
    beforeEach(() => {
      mockServer = createMockServer(true);
      session = new AgentSession(mockServer as AgentServer, 'test-session-123', MockAgioProvider);
    });

    it('should log query start in debug mode', async () => {
      await session.initialize();

      const query = 'Test query for debugging';
      await session.runQuery(query);

      expect(consoleSpy).toHaveBeenCalledWith(
        `[DEBUG] Query started - Session: test-session-123, Query: ${query.substring(0, 100)}...`,
      );
    });

    it('should log query completion in debug mode', async () => {
      await session.initialize();

      await session.runQuery('Test query');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG] Query completed successfully - Session: test-session-123',
      );
    });

    it('should log streaming query start in debug mode', async () => {
      await session.initialize();

      const query = 'Streaming test query';
      const stream = await session.runQueryStreaming(query);

      // Consume the stream
      for await (const event of stream) {
        // Just consume events
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        `[DEBUG] Streaming query started - Session: test-session-123, Query: ${query.substring(0, 100)}...`,
      );
    });

    it('should log streaming query completion in debug mode', async () => {
      await session.initialize();

      const stream = await session.runQueryStreaming('Test streaming');

      // Consume the stream completely
      for await (const event of stream) {
        // Just consume events
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG] Streaming query completed - Session: test-session-123',
      );
    });

    it('should truncate long queries in debug logs', async () => {
      await session.initialize();

      const longQuery = 'A'.repeat(200); // 200 character query
      await session.runQuery(longQuery);

      expect(consoleSpy).toHaveBeenCalledWith(
        `[DEBUG] Query started - Session: test-session-123, Query: ${'A'.repeat(100)}...`,
      );
    });

    it('should handle ContentPart queries in debug logs', async () => {
      await session.initialize();

      const contentPartQuery = [{ type: 'text', text: 'Test content part' }];
      await session.runQuery(contentPartQuery as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG] Query started - Session: test-session-123, Query: [ContentPart]',
      );
    });

    it('should log query failures in debug mode', async () => {
      await session.initialize();

      // Mock agent to throw an error
      const mockAgent = session.agent as MockAgent;
      const runSpy = vi.spyOn(mockAgent, 'run').mockRejectedValue(new Error('Test error'));

      await session.runQuery('Failing query');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG] Query failed - Session: test-session-123, Error: Test error',
      );

      // Restore original method
      runSpy.mockRestore();
    });

    it('should log streaming query failures in debug mode', async () => {
      await session.initialize();

      // Mock agent to throw an error in streaming mode
      const mockAgent = session.agent as MockAgent;
      const runSpy = vi.spyOn(mockAgent, 'run').mockRejectedValue(new Error('Streaming error'));

      const stream = await session.runQueryStreaming('Failing streaming query');

      // Consume the error stream
      for await (const event of stream) {
        // Just consume events
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG] Streaming query failed - Session: test-session-123, Error: Streaming error',
      );

      // Restore original method
      runSpy.mockRestore();
    });
  });

  describe('Debug mode disabled', () => {
    beforeEach(() => {
      mockServer = createMockServer(false);
      session = new AgentSession(mockServer as AgentServer, 'test-session-456', MockAgioProvider);
    });

    it('should not log debug messages when debug mode is disabled', async () => {
      await session.initialize();

      await session.runQuery('Test query without debug');

      // Should not have any debug logs
      const debugLogs = consoleSpy.mock.calls.filter(
        (call) => call[0] && call[0].includes('[DEBUG]'),
      );
      expect(debugLogs).toHaveLength(0);
    });

    it('should not log streaming debug messages when debug mode is disabled', async () => {
      await session.initialize();

      const stream = await session.runQueryStreaming('Test streaming without debug');

      // Consume the stream
      for await (const event of stream) {
        // Just consume events
      }

      // Should not have any debug logs
      const debugLogs = consoleSpy.mock.calls.filter(
        (call) => call[0] && call[0].includes('[DEBUG]'),
      );
      expect(debugLogs).toHaveLength(0);
    });
  });

  describe('Integration with exclusive mode', () => {
    beforeEach(() => {
      mockServer = createMockServer(true);
      session = new AgentSession(mockServer as AgentServer, 'exclusive-session', MockAgioProvider);
    });

    it('should log debug messages alongside exclusive mode operations', async () => {
      await session.initialize();

      await session.runQuery('Exclusive mode test');

      // Should have debug log for query start
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG] Query started - Session: exclusive-session, Query: Exclusive mode test...',
      );

      // Should have debug log for query completion
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DEBUG] Query completed successfully - Session: exclusive-session',
      );

      // Should have called exclusive mode methods
      expect(mockServer.setRunningSession).toHaveBeenCalledWith('exclusive-session');
      expect(mockServer.clearRunningSession).toHaveBeenCalledWith('exclusive-session');
    });
  });
});
