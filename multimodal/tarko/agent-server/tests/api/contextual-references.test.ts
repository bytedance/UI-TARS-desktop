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
import { executeQuery, executeStreamingQuery } from '../../src/api/controllers/queries';

describe('Contextual References Bug Fix', () => {
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

    // Default image processor behavior
    mockImageProcessor.compressImagesInQuery.mockImplementation((query) => Promise.resolve(query));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeQuery - environmentInput conditional logic', () => {
    it('should NOT pass environmentInput when query has no contextual references', async () => {
      const userQuery = 'Simple query without any @file or @dir references';
      
      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      // Mock: no contextual references found, returns original query
      mockContextProcessor.processContextualReferences.mockResolvedValue(userQuery);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'Response' },
      });

      await executeQuery(mockReq as Request, mockRes as Response);

      // Verify session.runQuery was called WITHOUT environmentInput
      expect(mockSession.runQuery).toHaveBeenCalledWith({
        input: userQuery,
        // environmentInput should NOT be present
      });

      // Verify environmentInput is not in the call
      const callArgs = mockSession.runQuery.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('environmentInput');
    });

    it('should pass environmentInput when query has valid contextual references', async () => {
      const userQuery = 'Analyze @file main.ts and @dir src/';
      const expandedContext = `<file path="main.ts">\nfunction main() { return 'hello'; }\n</file>\n\n<directory path="src/">\n// directory content\n</directory>\n\n${userQuery}`;
      
      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      // Mock: contextual references found, returns expanded content
      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'Analysis complete' },
      });

      await executeQuery(mockReq as Request, mockRes as Response);

      // Verify session.runQuery was called WITH environmentInput
      expect(mockSession.runQuery).toHaveBeenCalledWith({
        input: userQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
          metadata: {
            type: 'codebase',
          },
        },
      });
    });

    it('should handle edge case where expanded context is empty string', async () => {
      const userQuery = 'Query with @file nonexistent.txt';
      const expandedContext = ''; // Empty expansion
      
      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'File not found' },
      });

      await executeQuery(mockReq as Request, mockRes as Response);

      // Even with empty string, if it's different from original query, should pass environmentInput
      expect(mockSession.runQuery).toHaveBeenCalledWith({
        input: userQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
          metadata: {
            type: 'codebase',
          },
        },
      });
    });

    it('should handle multimodal queries without contextual references', async () => {
      const multimodalQuery = [
        { type: 'text', text: 'Analyze this image' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,test' } },
      ];
      
      mockReq.body = {
        sessionId: 'test-session',
        query: multimodalQuery,
      };

      // For multimodal queries, processContextualReferences returns the original query
      mockContextProcessor.processContextualReferences.mockResolvedValue(multimodalQuery);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'Image analyzed' },
      });

      await executeQuery(mockReq as Request, mockRes as Response);

      // Should NOT pass environmentInput for multimodal queries without references
      const callArgs = mockSession.runQuery.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('environmentInput');
    });
  });

  describe('executeStreamingQuery - environmentInput conditional logic', () => {
    it('should NOT pass environmentInput in streaming when no contextual references', async () => {
      const userQuery = 'Streaming query without references';
      
      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      const mockEventStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'assistant_message', content: 'Streaming response' };
        },
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue(userQuery);
      mockSession.runQueryStreaming.mockResolvedValue(mockEventStream);

      await executeStreamingQuery(mockReq as Request, mockRes as Response);

      // Verify session.runQueryStreaming was called WITHOUT environmentInput
      expect(mockSession.runQueryStreaming).toHaveBeenCalledWith({
        input: userQuery,
        // environmentInput should NOT be present
      });

      const callArgs = mockSession.runQueryStreaming.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('environmentInput');
    });

    it('should pass environmentInput in streaming when contextual references exist', async () => {
      const userQuery = 'Stream @file config.json';
      const expandedContext = `<file path="config.json">\n{"key": "value"}\n</file>\n\n${userQuery}`;
      
      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      const mockEventStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'user_message', content: userQuery };
          yield { type: 'environment_input', content: expandedContext };
          yield { type: 'assistant_message', content: 'Config analyzed' };
        },
      };

      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockSession.runQueryStreaming.mockResolvedValue(mockEventStream);

      await executeStreamingQuery(mockReq as Request, mockRes as Response);

      // Verify session.runQueryStreaming was called WITH environmentInput
      expect(mockSession.runQueryStreaming).toHaveBeenCalledWith({
        input: userQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
          metadata: {
            type: 'codebase',
          },
        },
      });
    });
  });

  describe('Bug reproduction tests', () => {
    it('should reproduce the original bug scenario from issue description', async () => {
      // This is the exact scenario from the issue:
      // User message without @dir or @file should NOT generate environment_input event
      const userQuery = '1. Open this game: https://cpstest.click/en/aim-trainer#google_vignette\n2. Select total sec to 50\n3. Play and pass this game';
      
      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      // Mock the context processor to return the original query (no contextual references)
      mockContextProcessor.processContextualReferences.mockResolvedValue(userQuery);
      
      const mockEventStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'user_message', content: userQuery };
          // Should NOT yield environment_input event
          yield { type: 'assistant_message', content: 'I\'ll help you with the game' };
        },
      };
      
      mockSession.runQueryStreaming.mockResolvedValue(mockEventStream);

      await executeStreamingQuery(mockReq as Request, mockRes as Response);

      // The fix: environmentInput should NOT be passed when no contextual references
      const callArgs = mockSession.runQueryStreaming.mock.calls[0][0];
      expect(callArgs).toEqual({
        input: userQuery,
        // No environmentInput property should be present
      });
      expect(callArgs).not.toHaveProperty('environmentInput');
    });

    it('should verify the fix prevents unnecessary environment_input events', async () => {
      const userQuery = 'Simple question without any file or directory references';
      
      mockReq.body = {
        sessionId: 'test-session',
        query: userQuery,
      };

      // Context processor returns original query (no expansion)
      mockContextProcessor.processContextualReferences.mockResolvedValue(userQuery);
      mockSession.runQuery.mockResolvedValue({
        success: true,
        result: { type: 'assistant_message', content: 'Simple answer' },
      });

      await executeQuery(mockReq as Request, mockRes as Response);

      // Verify the session was called without environmentInput
      // This prevents the Agent from emitting unnecessary environment_input events
      const sessionCallArgs = mockSession.runQuery.mock.calls[0][0];
      expect(sessionCallArgs.input).toBe(userQuery);
      expect(sessionCallArgs).not.toHaveProperty('environmentInput');
      
      // This ensures no environment_input event will be emitted by the Agent
      expect(mockSession.runQuery).toHaveBeenCalledTimes(1);
    });
  });
});
