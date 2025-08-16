/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentSession } from '../../src/core/AgentSession';
import { IAgent, AgentEventStream } from '@tarko/interface';

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

vi.mock('../../src/utils/event-stream');
vi.mock('../../src/utils/error-handler', () => ({
  createErrorResponse: vi.fn((error: any) => ({
    error: {
      message: error.message || 'Test error',
      code: 'TEST_ERROR',
    },
  })),
  handleAgentError: vi.fn((error: any) => ({
    code: 'TEST_ERROR',
    message: error.message || 'Test error',
    details: {},
  })),
}));

// Import after mocking
import { executeQuery, executeStreamingQuery } from '../../src/api/controllers/queries';

describe('Context Injection Integration', () => {
  let mockAgent: Partial<IAgent>;
  let mockSession: AgentSession;
  let mockServer: any;
  let capturedEvents: AgentEventStream.Event[];

  beforeEach(() => {
    vi.clearAllMocks();
    capturedEvents = [];

    // Mock Agent with event capture
    mockAgent = {
      initialize: vi.fn().mockResolvedValue(undefined),
      run: vi.fn(),
      getEventStream: vi.fn().mockReturnValue({
        subscribe: vi.fn().mockReturnValue(() => {}),
        createEvent: vi.fn().mockImplementation((type, data) => ({
          id: `event-${Date.now()}-${Math.random()}`,
          type,
          timestamp: Date.now(),
          ...data,
        })),
        sendEvent: vi.fn().mockImplementation((event) => {
          capturedEvents.push(event);
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

    // Create real AgentSession instance
    mockSession = new AgentSession(mockServer, 'test-session-integration');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('end-to-end context injection flow', () => {
    it('should process @file references and inject as environmentInput', async () => {
      const userQuery = 'Analyze the function in @file main.py';
      const expandedContext = 'def main():\n    print("Hello World")\n    return 0';
      const compressedQuery = 'Analyze the function in @file main.py';

      // Setup mocks
      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockImageProcessor.compressImagesInQuery.mockResolvedValue(compressedQuery);

      // Mock agent run to capture the options passed
      let capturedRunOptions: any;
      (mockAgent.run as any).mockImplementation(async (options) => {
        capturedRunOptions = options;
        return {
          type: 'assistant_message',
          content: 'I can see the main function that prints Hello World.',
          timestamp: Date.now(),
        };
      });

      // Initialize session
      await mockSession.initialize();

      // Execute query through session
      const result = await mockSession.runQuery({
        input: userQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
        },
      });

      // Verify the flow
      expect(result.success).toBe(true);
      expect(capturedRunOptions).toEqual({
        input: userQuery,
        sessionId: 'test-session-integration',
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
        },
      });
    });

    it('should handle controller -> session -> agent flow correctly', async () => {
      const userQuery = 'Check @dir src/ for any issues';
      const expandedContext = 'src/\n  - index.js\n  - utils.js\n  - config.json';
      const compressedQuery = 'Check @dir src/ for any issues';

      // Setup context processing mocks
      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockImageProcessor.compressImagesInQuery.mockResolvedValue(compressedQuery);

      // Mock agent run
      (mockAgent.run as any).mockResolvedValue({
        type: 'assistant_message',
        content: 'I found 3 files in the src directory.',
        timestamp: Date.now(),
      });

      // Initialize session
      await mockSession.initialize();

      // Mock Express request/response
      const mockReq = {
        body: {
          sessionId: 'test-session-integration',
          query: userQuery,
        },
        session: mockSession,
        app: {
          locals: {
            server: mockServer,
          },
        },
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as any;

      // Execute through controller
      await executeQuery(mockReq, mockRes);

      // Verify context processing was called
      expect(mockContextProcessor.processContextualReferences).toHaveBeenCalledWith(
        userQuery,
        '/test/workspace',
      );

      // Verify image compression was called on user input
      expect(mockImageProcessor.compressImagesInQuery).toHaveBeenCalledWith(userQuery);

      // Verify agent.run was called with separated inputs
      expect(mockAgent.run).toHaveBeenCalledWith({
        input: compressedQuery,
        sessionId: 'test-session-integration',
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
        },
      });

      // Verify successful response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        result: {
          type: 'assistant_message',
          content: 'I found 3 files in the src directory.',
          timestamp: expect.any(Number),
        },
      });
    });

    it('should handle streaming with context injection', async () => {
      const userQuery = 'Explain @file package.json dependencies';
      const expandedContext = '{\n  "dependencies": {\n    "express": "^4.18.0"\n  }\n}';
      const compressedQuery = 'Explain @file package.json dependencies';

      // Setup mocks
      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockImageProcessor.compressImagesInQuery.mockResolvedValue(compressedQuery);

      // Mock streaming response
      const mockEventStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: 'assistant_streaming_message',
            content: 'The package.json shows',
            timestamp: Date.now(),
          };
          yield {
            type: 'assistant_streaming_message',
            content: ' Express as a dependency.',
            timestamp: Date.now(),
          };
          yield {
            type: 'assistant_message',
            content: 'The package.json shows Express as a dependency.',
            finishReason: 'stop',
            timestamp: Date.now(),
          };
        },
      };

      (mockAgent.run as any).mockResolvedValue(mockEventStream);

      // Initialize session
      await mockSession.initialize();

      // Mock Express request/response for streaming
      const mockReq = {
        body: {
          sessionId: 'test-session-integration',
          query: userQuery,
        },
        session: mockSession,
        app: {
          locals: {
            server: mockServer,
          },
        },
      } as any;

      const mockRes = {
        setHeader: vi.fn().mockReturnThis(),
        write: vi.fn().mockReturnThis(),
        end: vi.fn().mockReturnThis(),
        closed: false,
        headersSent: false,
      } as any;

      // Execute streaming query
      await executeStreamingQuery(mockReq, mockRes);

      // Verify agent.run was called with streaming options and environmentInput
      expect(mockAgent.run).toHaveBeenCalledWith({
        input: compressedQuery,
        stream: true,
        sessionId: 'test-session-integration',
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
        },
      });

      // Verify streaming headers were set
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    });

    it('should preserve user input integrity while injecting context', async () => {
      const multimodalUserQuery = [
        { type: 'text', text: 'Compare this image with @file reference.png' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,userimage' } },
      ];
      const expandedContext = 'Reference image shows a blue button';
      const compressedUserQuery = [
        { type: 'text', text: 'Compare this image with @file reference.png' },
        { type: 'image_url', image_url: { url: 'data:image/webp;base64,compressed' } },
      ];

      // Setup mocks
      mockContextProcessor.processContextualReferences.mockResolvedValue(expandedContext);
      mockImageProcessor.compressImagesInQuery.mockResolvedValue(compressedUserQuery);

      let capturedRunOptions: any;
      (mockAgent.run as any).mockImplementation(async (options) => {
        capturedRunOptions = options;
        return {
          type: 'assistant_message',
          content: 'I can compare the images for you.',
          timestamp: Date.now(),
        };
      });

      // Initialize session
      await mockSession.initialize();

      // Execute query
      const result = await mockSession.runQuery({
        input: multimodalUserQuery,
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
        },
      });

      // Verify user input was processed separately from context
      expect(mockContextProcessor.processContextualReferences).toHaveBeenCalledWith(
        multimodalUserQuery,
        '/test/workspace',
      );
      expect(mockImageProcessor.compressImagesInQuery).toHaveBeenCalledWith(multimodalUserQuery);

      // Verify agent received both compressed user input and separate context
      expect(capturedRunOptions).toEqual({
        input: multimodalUserQuery, // User passed the input directly to session
        sessionId: 'test-session-integration',
        environmentInput: {
          content: expandedContext, // Separate context
          description: 'Expanded context from contextual references',
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling in integration flow', () => {
    it('should handle context processing errors gracefully', async () => {
      const userQuery = 'Process @file nonexistent.js';
      const processingError = new Error('File not found');

      mockContextProcessor.processContextualReferences.mockRejectedValue(processingError);

      const mockReq = {
        body: {
          sessionId: 'test-session-integration',
          query: userQuery,
        },
        session: mockSession,
        app: {
          locals: {
            server: mockServer,
          },
        },
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as any;

      await executeQuery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'File not found',
          code: 'TEST_ERROR',
        },
      });
    });
  });
});
