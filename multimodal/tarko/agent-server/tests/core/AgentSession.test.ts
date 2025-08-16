/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentSession, AgentQueryResponse } from '../../src/core/AgentSession';
import type { AgentServer } from '../../src/server';
import { EventStreamBridge } from '../../src/utils/event-stream';
import { ChatCompletionContentPart, AgentEventStream, IAgent } from '@tarko/interface';

// Mock dependencies
vi.mock('../../src/utils/event-stream');
vi.mock('../../src/utils/error-handler', () => ({
  handleAgentError: vi.fn((error: any) => ({
    code: 'TEST_ERROR',
    message: error.message || 'Test error',
    details: {},
  })),
}));

describe('AgentSession', () => {
  let mockServer: Partial<AgentServer>;
  let mockAgent: Partial<IAgent>;
  let mockEventBridge: Partial<EventStreamBridge>;
  let session: AgentSession;
  const sessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock agent with required methods
    mockAgent = {
      initialize: vi.fn().mockResolvedValue(undefined),
      run: vi.fn(),
      getEventStream: vi.fn().mockReturnValue({
        subscribe: vi.fn().mockReturnValue(() => {}),
        createEvent: vi.fn().mockReturnValue({
          type: 'system',
          level: 'error',
          message: 'Test error',
          timestamp: Date.now(),
        }),
      }),
      status: vi.fn().mockReturnValue('idle'),
      abort: vi.fn().mockReturnValue(false),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    // Mock server
    mockServer = {
      appConfig: {},
      createAgentWithSessionModel: vi.fn().mockReturnValue(mockAgent),
      getCurrentWorkspace: vi.fn().mockReturnValue('/test/workspace'),
      storageProvider: null,
    };

    // Mock event bridge
    mockEventBridge = {
      connectToAgentEventStream: vi.fn().mockReturnValue(() => {}),
      emit: vi.fn(),
    };

    (EventStreamBridge as any).mockImplementation(() => mockEventBridge);

    session = new AgentSession(mockServer as AgentServer, sessionId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create session with correct id', () => {
      expect(session.id).toBe(sessionId);
    });

    it('should create agent using server factory', () => {
      expect(mockServer.createAgentWithSessionModel).toHaveBeenCalledWith(undefined);
    });

    it('should initialize agent and connect event stream', async () => {
      await session.initialize();

      expect(mockAgent.initialize).toHaveBeenCalled();
      expect(mockAgent.getEventStream).toHaveBeenCalled();
      expect(mockEventBridge.connectToAgentEventStream).toHaveBeenCalled();
      expect(mockEventBridge.emit).toHaveBeenCalledWith('ready', { sessionId });
    });
  });

  describe('runQuery with environmentInput', () => {
    beforeEach(async () => {
      await session.initialize();
    });

    it('should pass environmentInput to agent run method', async () => {
      const testInput = 'Test query';
      const testEnvironmentInput = {
        content: 'Context from @file references',
        description: 'Expanded context from contextual references',
      };

      const mockResult = {
        type: 'assistant_message',
        content: 'Test response',
        timestamp: Date.now(),
      };

      (mockAgent.run as any).mockResolvedValue(mockResult);

      const result = await session.runQuery({
        input: testInput,
        environmentInput: testEnvironmentInput,
      });

      // Verify agent.run was called with correct parameters
      expect(mockAgent.run).toHaveBeenCalledWith({
        input: testInput,
        sessionId,
        environmentInput: testEnvironmentInput,
      });

      // Verify successful response
      expect(result).toEqual({
        success: true,
        result: mockResult,
      });
    });

    it('should handle multimodal input with environmentInput', async () => {
      const multimodalInput: ChatCompletionContentPart[] = [
        { type: 'text', text: 'Analyze this image' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,test' } },
      ];

      const environmentInput = {
        content: 'File context: main.py contains helper functions',
        description: 'Code context',
      };

      const mockResult = {
        type: 'assistant_message',
        content: 'Analysis complete',
        timestamp: Date.now(),
      };

      (mockAgent.run as any).mockResolvedValue(mockResult);

      const result = await session.runQuery({
        input: multimodalInput,
        environmentInput,
      });

      expect(mockAgent.run).toHaveBeenCalledWith({
        input: multimodalInput,
        sessionId,
        environmentInput,
      });

      expect(result.success).toBe(true);
    });

    it('should work without environmentInput', async () => {
      const testInput = 'Simple query without context';

      const mockResult = {
        type: 'assistant_message',
        content: 'Simple response',
        timestamp: Date.now(),
      };

      (mockAgent.run as any).mockResolvedValue(mockResult);

      const result = await session.runQuery({
        input: testInput,
      });

      expect(mockAgent.run).toHaveBeenCalledWith({
        input: testInput,
        sessionId,
        environmentInput: undefined,
      });

      expect(result.success).toBe(true);
    });

    it('should handle agent errors gracefully', async () => {
      const testInput = 'Query that will fail';
      const testError = new Error('Agent execution failed');

      (mockAgent.run as any).mockRejectedValue(testError);

      const result = await session.runQuery({
        input: testInput,
      });

      expect(result).toEqual({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Agent execution failed',
          details: {},
        },
      });

      expect(mockEventBridge.emit).toHaveBeenCalledWith('error', {
        message: 'Agent execution failed',
      });
    });
  });

  describe('runQueryStreaming with environmentInput', () => {
    beforeEach(async () => {
      await session.initialize();
    });

    it('should pass environmentInput to streaming agent run', async () => {
      const testInput = 'Streaming query';
      const testEnvironmentInput = {
        content: 'Streaming context data',
        description: 'Context for streaming',
      };

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'assistant_message', content: 'Streaming response' };
        },
      };

      (mockAgent.run as any).mockResolvedValue(mockStream);

      const result = await session.runQueryStreaming({
        input: testInput,
        environmentInput: testEnvironmentInput,
      });

      expect(mockAgent.run).toHaveBeenCalledWith({
        input: testInput,
        stream: true,
        sessionId,
        environmentInput: testEnvironmentInput,
      });

      expect(result).toBe(mockStream);
    });

    it('should handle streaming errors and return error event stream', async () => {
      const testInput = 'Failing streaming query';
      const testError = new Error('Streaming failed');

      (mockAgent.run as any).mockRejectedValue(testError);

      const result = await session.runQueryStreaming({
        input: testInput,
      });

      // Should return an async iterable
      expect(result[Symbol.asyncIterator]).toBeDefined();

      // Collect events from the error stream
      const events = [];
      for await (const event of result) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'system',
        level: 'error',
        message: 'Test error',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('processing status', () => {
    beforeEach(async () => {
      await session.initialize();
    });

    it('should return correct processing status', () => {
      (mockAgent.status as any).mockReturnValue('executing');
      expect(session.getProcessingStatus()).toBe(true);

      (mockAgent.status as any).mockReturnValue('idle');
      expect(session.getProcessingStatus()).toBe(false);
    });
  });

  describe('query abortion', () => {
    beforeEach(async () => {
      await session.initialize();
    });

    it('should abort query and emit event', async () => {
      (mockAgent.abort as any).mockReturnValue(true);

      const result = await session.abortQuery();

      expect(mockAgent.abort).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(mockEventBridge.emit).toHaveBeenCalledWith('aborted', { sessionId });
    });

    it('should handle abort errors', async () => {
      const abortError = new Error('Abort failed');
      (mockAgent.abort as any).mockImplementation(() => {
        throw abortError;
      });

      const result = await session.abortQuery();

      expect(result).toBe(false);
      expect(mockEventBridge.emit).toHaveBeenCalledWith('error', {
        message: 'Abort failed',
      });
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await session.initialize();
    });

    it('should cleanup resources properly', async () => {
      await session.cleanup();

      expect(mockAgent.dispose).toHaveBeenCalled();
      expect(mockEventBridge.emit).toHaveBeenCalledWith('closed', { sessionId });
    });
  });
});
