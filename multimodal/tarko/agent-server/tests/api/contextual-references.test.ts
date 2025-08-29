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
  mockSession: { runQuery: vi.fn(), runQueryStreaming: vi.fn() },
  mockServer: { getCurrentWorkspace: vi.fn().mockReturnValue('/workspace') },
}));

vi.mock('@tarko/context-engineer/node', () => ({
  ContextReferenceProcessor: vi.fn(() => mockContextProcessor),
  ImageProcessor: vi.fn(() => mockImageProcessor),
}));

// Import after mocking
import { executeQuery, executeStreamingQuery } from '../../src/api/controllers/queries';

vi.mock('../../src/utils/error-handler', () => ({
  createErrorResponse: vi.fn((error: any) => ({ error: { message: error.message, code: 'ERROR' } })),
}));

// Test helpers
const createMockRequest = (query: any) => ({
  body: { sessionId: 'test-session', query },
  session: mockSession,
  app: { locals: { server: mockServer } },
}) as Partial<Request>;

const createMockResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  setHeader: vi.fn().mockReturnThis(),
  write: vi.fn().mockReturnThis(),
  end: vi.fn().mockReturnThis(),
  closed: false,
}) as Partial<Response>;

const mockContextResult = (expandedContext: string | null) => {
  mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
};

const mockSuccessResponse = (content = 'Response') => {
  mockSession.runQuery.mockResolvedValue({
    success: true,
    result: { type: 'assistant_message', content },
  });
};

describe('Contextual References Bug Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImageProcessor.compressImagesInQuery.mockImplementation(q => Promise.resolve(q));
  });

  describe('environmentInput conditional logic', () => {
    const testCases = [
      {
        name: 'should NOT pass environmentInput when no contextual references',
        query: 'Simple query without references',
        expandedContext: null,
        expectEnvironmentInput: false,
      },
      {
        name: 'should NOT pass environmentInput when empty string context',
        query: 'Query with @file nonexistent.txt',
        expandedContext: '',
        expectEnvironmentInput: false,
      },
      {
        name: 'should pass environmentInput when valid contextual references',
        query: 'Analyze @file main.ts',
        expandedContext: '<file path="main.ts">content</file>',
        expectEnvironmentInput: true,
      },
    ];

    testCases.forEach(({ name, query, expandedContext, expectEnvironmentInput }) => {
      it(name, async () => {
        const req = createMockRequest(query);
        const res = createMockResponse();
        
        mockContextResult(expandedContext);
        mockSuccessResponse();

        await executeQuery(req as Request, res as Response);

        const callArgs = mockSession.runQuery.mock.calls[0][0];
        
        if (expectEnvironmentInput) {
          expect(callArgs).toHaveProperty('environmentInput');
          expect(callArgs.environmentInput.content).toBe(expandedContext);
        } else {
          expect(callArgs).not.toHaveProperty('environmentInput');
        }
      });
    });
  });

  describe('streaming queries', () => {
    it('should follow same environmentInput logic in streaming mode', async () => {
      const req = createMockRequest('Simple query');
      const res = createMockResponse();
      
      mockContextResult(null);
      mockSession.runQueryStreaming.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'assistant_message', content: 'Response' };
        },
      });

      await executeStreamingQuery(req as Request, res as Response);

      const callArgs = mockSession.runQueryStreaming.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('environmentInput');
    });
  });

  describe('bug reproduction', () => {
    it('should fix the original issue: no environment_input for simple queries', async () => {
      const bugQuery = '1. Open this game: https://cpstest.click/en/aim-trainer\n2. Select total sec to 50';
      const req = createMockRequest(bugQuery);
      const res = createMockResponse();
      
      // No contextual references found
      mockContextResult(null);
      mockSuccessResponse();

      await executeQuery(req as Request, res as Response);

      // The fix: no environmentInput should be passed
      const callArgs = mockSession.runQuery.mock.calls[0][0];
      expect(callArgs.input).toBe(bugQuery);
      expect(callArgs).not.toHaveProperty('environmentInput');
    });
  });
});
