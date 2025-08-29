/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// Use vi.hoisted to ensure mocks are available during module mocking
const { mockContextProcessor, mockImageProcessor, mockSession, mockServer } = vi.hoisted(() => ({
  mockContextProcessor: { processContextualReferences: vi.fn() },
  mockImageProcessor: { compressImagesInQuery: vi.fn() },
  mockSession: { runQuery: vi.fn(), runQueryStreaming: vi.fn(), abortQuery: vi.fn() },
  mockServer: { getCurrentWorkspace: vi.fn().mockReturnValue('/test/workspace') },
}));

vi.mock('@tarko/context-engineer/node', () => ({
  ContextReferenceProcessor: vi.fn(() => mockContextProcessor),
  ImageProcessor: vi.fn(() => mockImageProcessor),
}));

// Import after mocking
import { executeQuery, executeStreamingQuery, abortQuery } from '../../src/api/controllers/queries';

vi.mock('../../src/utils/error-handler', () => ({
  createErrorResponse: vi.fn((error: any) => ({
    error: { message: error.message || 'Test error', code: 'TEST_ERROR' },
  })),
}));

// Test helpers
const createRequest = (query: any, sessionId = 'test-session') => ({
  body: { sessionId, query },
  session: mockSession,
  app: { locals: { server: mockServer } },
}) as Partial<Request>;

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  setHeader: vi.fn().mockReturnThis(),
  write: vi.fn().mockReturnThis(),
  end: vi.fn().mockReturnThis(),
  closed: false,
  headersSent: false,
}) as Partial<Response>;

const mockProcessing = (expandedContext: string | null, compressedQuery: any = null) => {
  mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
  mockImageProcessor.compressImagesInQuery.mockResolvedValue(compressedQuery);
};

describe('Queries Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeQuery', () => {
    it('should process context and pass environmentInput when references exist', async () => {
      const userQuery = 'Test query with @file reference';
      const expandedContext = 'File content: function test() { return true; }';
      const req = createRequest(userQuery);
      const res = createResponse();

      mockProcessing(expandedContext, userQuery);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'Response' },
      });

      await executeQuery(req as Request, res as Response);

      expect(mockContextProcessor.processContextualReferences).toHaveBeenCalledWith(
        userQuery,
        '/test/workspace',
      );
      expect(mockSession.runQuery).toHaveBeenCalledWith({
        input: userQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
          metadata: { type: 'codebase' },
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
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
      const req = createRequest(multimodalQuery);
      const res = createResponse();

      mockProcessing(expandedContext, compressedQuery);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'Analysis complete' },
      });

      await executeQuery(req as Request, res as Response);

      expect(mockSession.runQuery).toHaveBeenCalledWith({
        input: compressedQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
          metadata: { type: 'codebase' },
        },
      });
    });

    it('should return 400 for missing query', async () => {
      const req = createRequest(undefined);
      const res = createResponse();
      req.body = { sessionId: 'test-session' };

      await executeQuery(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Query is required' });
    });

    it('should handle session errors', async () => {
      const req = createRequest('Test query');
      const res = createResponse();

      mockProcessing('context', 'Test query');
      mockSession.runQuery.mockResolvedValue({
        success: false,
        error: { code: 'AGENT_ERROR', message: 'Agent failed' },
      });

      await executeQuery(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'AGENT_ERROR', message: 'Agent failed' },
      });
    });

    it('should handle unexpected errors', async () => {
      const req = createRequest('Test query');
      const res = createResponse();

      mockContextProcessor.processContextualReferences.mockRejectedValue(
        new Error('Unexpected error')
      );

      await executeQuery(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: { message: 'Unexpected error', code: 'TEST_ERROR' },
      });
    });
  });

  describe('executeStreamingQuery', () => {
    it('should process context and stream with environmentInput', async () => {
      const userQuery = 'Streaming query with @dir reference';
      const expandedContext = 'Directory listing: file1.js, file2.ts';
      const req = createRequest(userQuery);
      const res = createResponse();

      const mockEventStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'assistant_streaming_message', content: 'Streaming' };
          yield { type: 'assistant_message', content: 'Complete', finishReason: 'stop' };
        },
      };

      mockProcessing(expandedContext, userQuery);
      mockSession.runQueryStreaming.mockResolvedValue(mockEventStream);

      await executeStreamingQuery(req as Request, res as Response);

      expect(mockSession.runQueryStreaming).toHaveBeenCalledWith({
        input: userQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
          metadata: { type: 'codebase' },
        },
      });

      // Verify streaming headers
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    });

    it('should handle streaming errors', async () => {
      const req = createRequest('Test query');
      const res = createResponse();

      const mockErrorStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'system', level: 'error', message: 'Stream error' };
        },
      };

      mockProcessing('context', 'Test query');
      mockSession.runQueryStreaming.mockResolvedValue(mockErrorStream);

      await executeStreamingQuery(req as Request, res as Response);

      expect(res.write).toHaveBeenCalledWith(
        'data: {"type":"system","level":"error","message":"Stream error"}\n\n',
      );
    });

    it('should handle closed connection', async () => {
      const req = createRequest('Test query');
      const res = createResponse();
      res.closed = true;

      const mockEventStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'assistant_message', content: 'Response' };
        },
      };

      mockProcessing('context', 'Test query');
      mockSession.runQueryStreaming.mockResolvedValue(mockEventStream);

      await executeStreamingQuery(req as Request, res as Response);

      expect(res.write).not.toHaveBeenCalled();
    });
  });

  describe('abortQuery', () => {
    it('should abort query successfully', async () => {
      const req = createRequest(undefined);
      const res = createResponse();
      req.body = { sessionId: 'test-session' };
      
      mockSession.abortQuery.mockResolvedValue(true);

      await abortQuery(req as Request, res as Response);

      expect(mockSession.abortQuery).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle abort errors', async () => {
      const req = createRequest(undefined);
      const res = createResponse();
      req.body = { sessionId: 'test-session' };
      
      mockSession.abortQuery.mockRejectedValue(new Error('Abort failed'));

      await abortQuery(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to abort query' });
    });
  });
});
