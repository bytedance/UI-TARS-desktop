/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createErrorResponse } from '../utils/error-handler';
import type { HonoContext } from '../types';

// Import context processing from @tarko/context-engineer if available
// Note: Fallback implementation if package is not available
let imageProcessor: any = null;
let contextReferenceProcessor: any = null;

try {
  const { ImageProcessor, ContextReferenceProcessor } = require('@tarko/context-engineer/node');

  imageProcessor = new ImageProcessor({
    quality: 5,
    format: 'webp',
  });

  contextReferenceProcessor = new ContextReferenceProcessor({
    maxFileSize: 2 * 1024 * 1024, // 2MB limit for LLM context
    ignoreExtensions: [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
      '.pdf',
      '.zip',
      '.tar',
      '.gz',
      '.exe',
      '.dll',
    ],
    ignoreDirs: ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.vscode', '.idea'],
    maxDepth: 8,
  });
} catch (error) {
  console.warn(
    'Context engineer not available, contextual references will be passed through as-is',
  );
}

/**
 * Execute a non-streaming query
 */
export async function executeQuery(c: HonoContext) {
  try {
    const body = await c.req.json();
    const { sessionId, query } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const server = c.get('server');
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Get workspace path from server
    const workspacePath = server.getCurrentWorkspace();

    // Process contextual references if processor is available
    let expandedContext: string | null = null;
    let compressedQuery = query;

    if (contextReferenceProcessor) {
      try {
        expandedContext = await contextReferenceProcessor.processContextualReferences(
          query,
          workspacePath,
        );
      } catch (error) {
        console.warn('Failed to process contextual references:', error);
      }
    }

    // Compress images if processor is available
    if (imageProcessor) {
      try {
        compressedQuery = await imageProcessor.compressImagesInQuery(query);
      } catch (error) {
        console.warn('Failed to compress images:', error);
        compressedQuery = query; // fallback to original query
      }
    }

    // Build run options
    const runOptions = {
      input: compressedQuery,
      ...(expandedContext && {
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
          metadata: {
            type: 'codebase' as const,
          },
        },
      }),
    };

    // Execute query using session
    const response = await session.runQuery(runOptions);

    if (response.success) {
      return c.json({ result: response.result }, 200);
    } else {
      return c.json(response, 500);
    }
  } catch (error) {
    console.error('Unexpected error processing query:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Execute a streaming query
 */
export async function executeStreamingQuery(c: HonoContext): Promise<Response> {
  try {
    const body = await c.req.json();
    const { sessionId, query } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const server = c.get('server');
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Get workspace path from server
    const workspacePath = server.getCurrentWorkspace();

    // Process contextual references if processor is available
    let expandedContext: string | null = null;
    let compressedQuery = query;

    if (contextReferenceProcessor) {
      try {
        expandedContext = await contextReferenceProcessor.processContextualReferences(
          query,
          workspacePath,
        );
      } catch (error) {
        console.warn('Failed to process contextual references:', error);
      }
    }

    // Compress images if processor is available
    if (imageProcessor) {
      try {
        compressedQuery = await imageProcessor.compressImagesInQuery(query);
      } catch (error) {
        console.warn('Failed to compress images:', error);
        compressedQuery = query; // fallback to original query
      }
    }

    // Build run options
    const runOptions = {
      input: compressedQuery,
      ...(expandedContext && {
        environmentInput: {
          content: expandedContext,
          description: 'Expanded context from contextual references',
          metadata: {
            type: 'codebase' as const,
          },
        },
      }),
    };

    // Set up Server-Sent Events headers
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Headers', 'Cache-Control');

    // Execute streaming query
    const stream = await session.runQueryStreaming(runOptions);

    // Create response stream
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorEvent = {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown streaming error',
            timestamp: Date.now(),
          };
          const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('Unexpected error processing streaming query:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Abort a running query
 */
export async function abortQuery(c: HonoContext) {
  try {
    const session = c.get('session');

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const success = await session.abortQuery();

    return c.json(
      {
        success,
        message: success ? 'Query aborted successfully' : 'No running query to abort',
      },
      200,
    );
  } catch (error) {
    console.error('Error aborting query:', error);
    return c.json(createErrorResponse(error), 500);
  }
}
