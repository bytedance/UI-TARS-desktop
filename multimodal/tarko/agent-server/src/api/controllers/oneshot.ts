/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { ChatCompletionContentPart } from '@tarko/interface';
import { nanoid } from 'nanoid';
import { SessionInfo } from '../../storage';
import { AgentSession } from '../../core';
import { createErrorResponse } from '../../utils/error-handler';

/**
 * Interface for one-shot query request body
 */
interface OneshotQueryRequest {
  /**
   * Query content to be processed
   */
  query: string | ChatCompletionContentPart[];

  /**
   * Optional session name to identify the session
   */
  sessionName?: string;

  /**
   * Optional session tags for organization
   */
  sessionTags?: string[];
}

/**
 * Execute a query in a newly created session (non-streaming)
 */
export async function createAndQuery(req: Request, res: Response) {
  try {
    const { query, sessionName, sessionTags } = req.body as OneshotQueryRequest;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Create new session
    const server = req.app.locals.server;
    const sessionId = nanoid();

    // Create session with custom AGIO provider if available
    const session = new AgentSession(server, sessionId, server.getCustomAgioProvider());

    server.sessions[sessionId] = session;

    // Initialize session
    const { storageUnsubscribe } = await session.initialize();

    // Save unsubscribe function for cleanup
    if (storageUnsubscribe) {
      server.storageUnsubscribes[sessionId] = storageUnsubscribe;
    }

    // Store session metadata if storage is available
    if (server.storageProvider) {
      const metadataContent: SessionInfo['metadata'] = { version: 1 };
      if (sessionName) metadataContent.name = sessionName;
      if (sessionTags) metadataContent.tags = sessionTags;

      const metadata: SessionInfo = {
        id: sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workspace: server.getCurrentWorkspace(),
        metadata: Object.keys(metadataContent).length > 1 ? metadataContent : undefined,
      };

      await server.storageProvider.createSession(metadata);
    }

    // Execute query on new session
    const response = await session.runQuery({ input: query });

    if (response.success) {
      res.status(200).json({
        sessionId,
        result: response.result,
      });
    } else {
      // Send structured error response with 500 status
      res.status(500).json({
        sessionId,
        ...response,
      });
    }
  } catch (error) {
    console.error(`Unexpected error in createAndQuery:`, error);
    res.status(500).json(createErrorResponse(error));
  }
}

/**
 * Execute a streaming query in a newly created session
 */
export async function createAndStreamingQuery(req: Request, res: Response) {
  try {
    const { query, sessionName, sessionTags } = req.body as OneshotQueryRequest;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Create new session
    const server = req.app.locals.server;
    const sessionId = nanoid();

    // Create session with custom AGIO provider if available
    const session = new AgentSession(server, sessionId, server.getCustomAgioProvider());

    server.sessions[sessionId] = session;

    // Initialize session
    const { storageUnsubscribe } = await session.initialize();

    // Save unsubscribe function for cleanup
    if (storageUnsubscribe) {
      server.storageUnsubscribes[sessionId] = storageUnsubscribe;
    }

    // Store session metadata if storage is available
    if (server.storageProvider) {
      const metadataContent: SessionInfo['metadata'] = { version: 1 };
      if (sessionName) metadataContent.name = sessionName;
      if (sessionTags) metadataContent.tags = sessionTags;

      const metadata: SessionInfo = {
        id: sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workspace: server.getCurrentWorkspace(),
        metadata: Object.keys(metadataContent).length > 1 ? metadataContent : undefined,
      };

      await server.storageProvider.createSession(metadata);
    }

    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send session ID as the first event
    res.write(
      `data: ${JSON.stringify({
        type: 'session_created',
        sessionId,
        timestamp: Date.now(),
      })}\n\n`,
    );

    // Get streaming response
    const eventStream = await session.runQueryStreaming({ input: query });

    // Stream events one by one
    for await (const event of eventStream) {
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
    console.error(`Critical error in streaming query creation:`, error);

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
