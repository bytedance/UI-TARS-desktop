/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { createErrorResponse } from '../../utils/error-handler';
import { ContextReferenceProcessor, ImageProcessor } from '@tarko/context-engineer/node';

const imageProcessor = new ImageProcessor({
  quality: 5,
  format: 'webp',
});

const contextReferenceProcessor = new ContextReferenceProcessor({
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

/**
 * Execute a non-streaming query
 */
export async function executeQuery(req: Request, res: Response) {
  const { sessionId, query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Get server instance to access workspace path
    const server = req.app.locals.server;
    const workspacePath = server.getCurrentWorkspace();

    // Process contextual references and pass as environment input to agent options
    const expandedContext = await contextReferenceProcessor.processContextualReferences(
      query,
      workspacePath,
    );

    // Compress images in user input only
    const compressedQuery = await imageProcessor.compressImagesInQuery(query);

    // Only pass environmentInput if there are actual contextual references
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

    // Use enhanced error handling in runQuery with environment input
    const response = await req.session!.runQuery(runOptions);

    if (response.success) {
      res.status(200).json({ result: response.result });
    } else {
      // Send structured error response with 500 status
      res.status(500).json(response);
    }
  } catch (error) {
    // This should never happen with the new error handling, but just in case
    console.error(`Unexpected error processing query in session ${sessionId}:`, error);
    res.status(500).json(createErrorResponse(error));
  }
}

/**
 * Execute a streaming query
 */
export async function executeStreamingQuery(req: Request, res: Response) {
  const { sessionId, query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get server instance to access workspace path
    const server = req.app.locals.server;
    const workspacePath = server.getCurrentWorkspace();

    // Process contextual references and pass as environment input to agent options
    const expandedContext = await contextReferenceProcessor.processContextualReferences(
      query,
      workspacePath,
    );

    // Compress images in user input only
    const compressedQuery = await imageProcessor.compressImagesInQuery(query);

    // Only pass environmentInput if there are actual contextual references
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

    // Get streaming response with environment input - any errors will be returned as events
    const eventStream = await req.session!.runQueryStreaming(runOptions);

    // Stream events one by one
    for await (const event of eventStream) {
      // Check for error events
      const isErrorEvent = event.type === 'system' && event.level === 'error';

      // Only send data when connection is still open
      if (!res.closed) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);

        // If we encounter an error event, end streaming
        if (isErrorEvent) {
          break;
        }
      } else {
        break;
      }
    }

    // End the stream response
    if (!res.closed) {
      res.end();
    }
  } catch (error) {
    // This should almost never happen with the new error handling
    console.error(`Critical error in streaming query for session ${sessionId}:`, error);

    if (!res.headersSent) {
      res.status(500).json(createErrorResponse(error));
    } else {
      const errorObj = createErrorResponse(error);
      res.write(
        `data: ${JSON.stringify({
          type: 'system',
          level: 'error',
          message: errorObj.error.message,
          timestamp: Date.now(),
        })}\n\n`,
      );
      res.end();
    }
  }
}

/**
 * Abort a running query
 */
export async function abortQuery(req: Request, res: Response) {
  const { sessionId } = req.body;

  try {
    const aborted = await req.session!.abortQuery();
    res.status(200).json({ success: aborted });
  } catch (error) {
    console.error(`Error aborting query in session ${sessionId}:`, error);
    res.status(500).json({ error: 'Failed to abort query' });
  }
}
