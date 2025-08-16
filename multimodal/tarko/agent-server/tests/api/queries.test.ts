/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Use vi.hoisted to ensure mock objects are available during module mocking
const { mockContextProcessor, mockImageProcessor } = vi.hoisted(() => ({
  mockContextProcessor: {
    processContextualReferences: vi.fn(),
  },
  mockImageProcessor: {
    compressImagesInQuery: vi.fn(),
  },
}));

vi.mock('@tarko/context-engineer/node', () => ({
  ContextReferenceProcessor: vi.fn(() => mockContextProcessor),
  ImageProcessor: vi.fn(() => mockImageProcessor),
}));

vi.mock('../../src/utils/error-handler', () => ({
  createErrorResponse: vi.fn((error: any) => ({
    error: {
      message: error.message || 'Test error',
      code: 'TEST_ERROR',
    },
  })),
}));

// Import after mocking
import { executeQuery, executeStreamingQuery, abortQuery } from '../../src/api/controllers/queries';

describe('Queries Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockSession: any;
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock session
    mockSession = {
      runQuery: vi.fn(),
      runQueryStreaming: vi.fn(),
      abortQuery: vi.fn(),
    };

    // Mock server
    mockServer = {
      getCurrentWorkspace: vi.fn().mockReturnValue('/test/workspace'),
    };

    // Mock request
    mockReq = {
      body: {},
      session: mockSession,
      app: {
        locals: {
          server: mockServer,
        },
      },
    };

    // Mock response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      write: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      closed: false,
      headersSent: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeQuery', () => {
    it('should process context and pass environmentInput to session', async () => {
      const userQuery = 'Test query with @file reference';
      const expandedContext = 'File content: function test() { return true; }';
      const compressedQuery = 'Test query with @file reference';

      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockImageProcessor.compressImagesInQuery.mockResolvedValue(compressedQuery);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'Response' },
      });

      await executeQuery(mockReq as Request, mockRes as Response);

      // Verify context processing
      expect(mockContextProcessor.processContextualReferences).toHaveBeenCalledWith(
        userQuery,
        '/test/workspace',
      );

      // Verify image compression on user input only
      expect(mockImageProcessor.compressImagesInQuery).toHaveBeenCalledWith(userQuery);

      // Verify session.runQuery called with correct structure
      expect(mockSession.runQuery).toHaveBeenCalledWith({
        input: compressedQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
        },
      });

      // Verify successful response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        result: { type: 'assistant_message', content: 'Response' },
      });
    });

    it('should handle empty context expansion', async () => {
      const userQuery = 'Simple query without references';
      const expandedContext = '';
      const compressedQuery = 'Simple query without references';

      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockImageProcessor.compressImagesInQuery.mockResolvedValue(compressedQuery);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'Simple response' },
      });

      await executeQuery(mockReq as Request, mockRes as Response);

      // Should still pass environmentInput even if content is empty
      expect(mockSession.runQuery).toHaveBeenCalledWith({
        input: compressedQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
        },
      });
    });

    it('should handle multimodal queries', async () => {
      const multimodalQuery = [
        { type: 'text', text: 'Analyze @file main.py' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,test' } },
      ];
      const expandedContext = 'def main(): pass';
      const compressedQuery = [
        { type: 'text', text: 'Analyze @file main.py' },
        { type: 'image_url', image_url: { url: 'compressed_image_data' } },
      ];

      mockReq.body = {
        sessionId: 'test-session',
        query: multimodalQuery,
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockImageProcessor.compressImagesInQuery.mockResolvedValue(compressedQuery);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'Analysis complete' },
      });

      await executeQuery(mockReq as Request, mockRes as Response);

      expect(mockSession.runQuery).toHaveBeenCalledWith({
        input: compressedQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
        },
      });
    });

    it('should return 400 for missing query', async () => {
      mockReq.body = { sessionId: 'test-session' };

      await executeQuery(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Query is required' });
    });

    it('should handle session errors', async () => {
      mockReq.body = {
        sessionId: 'test-session',
        query: 'Test query',
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue('context');
      mockImageProcessor.compressImagesInQuery.mockResolvedValue('compressed');
      mockSession.runQuery.mockResolvedValue({
        success: false,
        error: { code: 'AGENT_ERROR', message: 'Agent failed' },
      });

      await executeQuery(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'AGENT_ERROR', message: 'Agent failed' },
      });
    });

    it('should handle unexpected errors', async () => {
      mockReq.body = {
        sessionId: 'test-session',
        query: 'Test query',
      };

      const unexpectedError = new Error('Unexpected error');
      mockContextProcessor.processContextualReferences.mockRejectedValue(unexpectedError);

      await executeQuery(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Unexpected error',
          code: 'TEST_ERROR',
        },
      });
    });
  });

  describe('executeStreamingQuery', () => {
    it('should process context and stream with environmentInput', async () => {
      const userQuery = 'Streaming query with @dir reference';
      const expandedContext = 'Directory listing: file1.js, file2.ts';
      const compressedQuery = 'Streaming query with @dir reference';

      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      const mockEventStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'assistant_streaming_message', content: 'Streaming' };
          yield { type: 'assistant_message', content: 'Complete', finishReason: 'stop' };
        },
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockImageProcessor.compressImagesInQuery.mockResolvedValue(compressedQuery);
      mockSession.runQueryStreaming.mockResolvedValue(mockEventStream);

      await executeStreamingQuery(mockReq as Request, mockRes as Response);

      // Verify session.runQueryStreaming called with correct structure
      expect(mockSession.runQueryStreaming).toHaveBeenCalledWith({
        input: compressedQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
        },
      });

      // Verify streaming headers
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');

      // Verify events were written
      expect(mockRes.write).toHaveBeenCalledWith(
        'data: {"type":"assistant_streaming_message","content":"Streaming"}\n\n',
      );
      expect(mockRes.write).toHaveBeenCalledWith(
        'data: {"type":"assistant_message","content":"Complete","finishReason":"stop"}\n\n',
      );
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should handle streaming errors', async () => {
      mockReq.body = {
        sessionId: 'test-session',
        query: 'Test query',
      };

      const mockErrorStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'system', level: 'error', message: 'Stream error' };
        },
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue('context');
      mockImageProcessor.compressImagesInQuery.mockResolvedValue('compressed');
      mockSession.runQueryStreaming.mockResolvedValue(mockErrorStream);

      await executeStreamingQuery(mockReq as Request, mockRes as Response);

      // Should write error event and break
      expect(mockRes.write).toHaveBeenCalledWith(
        'data: {"type":"system","level":"error","message":"Stream error"}\n\n',
      );
    });

    it('should handle closed connection', async () => {
      mockReq.body = {
        sessionId: 'test-session',
        query: 'Test query',
      };

      const mockEventStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'assistant_message', content: 'Response' };
        },
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue('context');
      mockImageProcessor.compressImagesInQuery.mockResolvedValue('compressed');
      mockSession.runQueryStreaming.mockResolvedValue(mockEventStream);

      // Simulate closed connection
      mockRes.closed = true;

      await executeStreamingQuery(mockReq as Request, mockRes as Response);

      // Should not write to closed connection
      expect(mockRes.write).not.toHaveBeenCalled();
    });
  });

  describe('abortQuery', () => {
    it('should abort query successfully', async () => {
      mockReq.body = { sessionId: 'test-session' };
      mockSession.abortQuery.mockResolvedValue(true);

      await abortQuery(mockReq as Request, mockRes as Response);

      expect(mockSession.abortQuery).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle abort errors', async () => {
      mockReq.body = { sessionId: 'test-session' };
      const abortError = new Error('Abort failed');
      mockSession.abortQuery.mockRejectedValue(abortError);

      await abortQuery(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to abort query' });
    });
  });
});
