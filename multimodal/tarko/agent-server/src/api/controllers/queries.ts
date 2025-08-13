/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { createErrorResponse } from '../../utils/error-handler';
import { ContextReferenceProcessor, ImageProcessor } from '@tarko/context-engineer/node';
import { AgentContext } from '@tarko/agent-interface';

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
 * Parse contextual references from user input and separate pure user input from context references
 * @param input - The user input potentially containing @file:path, @dir:path, @workspace references
 * @returns Object containing pure user input and array of contextual references
 */
function parseContextualReferences(input: string): {
  pureUserInput: string;
  contextualReferences: Array<{
    id: string;
    type: 'file' | 'directory' | 'workspace';
    path: string;
    name: string;
    metadata: any;
  }>;
} {
  const contextualRefs: any[] = [];
  let pureInput = input;

  // Parse @file:path references
  const fileMatches = input.matchAll(/@file:([^\s]+)/g);
  for (const match of fileMatches) {
    const [fullMatch, path] = match;
    contextualRefs.push({
      id: `file-${path}`,
      type: 'file',
      path,
      name: path.split('/').pop() || path,
      metadata: { relativePath: path },
    });
    pureInput = pureInput.replace(fullMatch, '').trim();
  }

  // Parse @dir:path references
  const dirMatches = input.matchAll(/@dir:([^\s]+)/g);
  for (const match of dirMatches) {
    const [fullMatch, path] = match;
    contextualRefs.push({
      id: `dir-${path}`,
      type: 'directory',
      path,
      name: path.split('/').pop() || path,
      metadata: { relativePath: path },
    });
    pureInput = pureInput.replace(fullMatch, '').trim();
  }

  // Parse @workspace references
  const workspaceMatches = input.matchAll(/@workspace/g);
  for (const match of workspaceMatches) {
    contextualRefs.push({
      id: 'workspace',
      type: 'workspace',
      path: '/',
      name: 'workspace',
      metadata: { relativePath: '.' },
    });
    pureInput = pureInput.replace(match[0], '').trim();
  }

  // Clean up extra whitespace
  pureInput = pureInput.replace(/\s+/g, ' ').trim();

  return {
    pureUserInput: pureInput,
    contextualReferences: contextualRefs,
  };
}

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

    // Parse contextual references from user input
    const { pureUserInput, contextualReferences } = parseContextualReferences(query);

    // Process contexts (without modifying original query for display)
    const processedContexts: AgentContext[] = [];
    if (contextualReferences.length > 0) {
      for (const contextRef of contextualReferences) {
        try {
          // Create a temporary query with just this context reference to process it
          const tempQuery = `@${contextRef.type}:${contextRef.path}`;
          const processedContent = await contextReferenceProcessor.processContextualReferences(
            tempQuery,
            workspacePath,
          );
          processedContexts.push({
            id: contextRef.id,
            type: contextRef.type,
            content: processedContent,
            description: `${contextRef.type}: ${contextRef.name || contextRef.path}`,
            metadata: contextRef.metadata,
          });
        } catch (error) {
          console.warn(`Failed to process context reference ${contextRef.id}:`, error);
          // Continue with other contexts even if one fails
        }
      }
    }

    // Compress images (only for user input)
    const compressedQuery = await imageProcessor.compressImagesInQuery(pureUserInput);

    // Run Agent with new interface - pass contexts separately
    const response = await req.session!.runQuery({
      input: compressedQuery,
      contexts: processedContexts,
    });

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

    // Parse contextual references from user input
    const { pureUserInput, contextualReferences } = parseContextualReferences(query);

    // Process contexts (without modifying original query for display)
    const processedContexts: AgentContext[] = [];
    if (contextualReferences.length > 0) {
      for (const contextRef of contextualReferences) {
        try {
          // Create a temporary query with just this context reference to process it
          const tempQuery = `@${contextRef.type}:${contextRef.path}`;
          const processedContent = await contextReferenceProcessor.processContextualReferences(
            tempQuery,
            workspacePath,
          );
          processedContexts.push({
            id: contextRef.id,
            type: contextRef.type,
            content: processedContent,
            description: `${contextRef.type}: ${contextRef.name || contextRef.path}`,
            metadata: contextRef.metadata,
          });
        } catch (error) {
          console.warn(`Failed to process context reference ${contextRef.id}:`, error);
          // Continue with other contexts even if one fails
        }
      }
    }

    // Compress images (only for user input)
    const compressedQuery = await imageProcessor.compressImagesInQuery(pureUserInput);

    // Get streaming response with separated contexts - any errors will be returned as events
    const eventStream = await req.session!.runQueryStreaming({
      input: compressedQuery,
      contexts: processedContexts,
    });

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
    const aborted = req.session!.abortQuery();
    res.status(200).json({ success: aborted });
  } catch (error) {
    console.error(`Error aborting query in session ${sessionId}:`, error);
    res.status(500).json({ error: 'Failed to abort query' });
  }
}
