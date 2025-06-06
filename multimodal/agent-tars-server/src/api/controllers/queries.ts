import { Request, Response } from 'express';
import { AgentTARSServer } from '../../server';

/**
 * QueriesController - Handles all query execution API endpoints
 *
 * Responsible for:
 * - Processing user queries in both streaming and non-streaming modes
 * - Aborting running queries
 * - Managing query execution flow
 */
export class QueriesController {
  /**
   * Execute a non-streaming query
   */
  async executeQuery(req: Request, res: Response) {
    const { sessionId, query } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const server = req.app.locals.server as AgentTARSServer;
    if (!server.sessions[sessionId]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    try {
      const result = await server.sessions[sessionId].runQuery(query);
      res.status(200).json({ result });
    } catch (error) {
      console.error(`Error processing query in session ${sessionId}:`, error);
      res.status(500).json({ error: 'Failed to process query' });
    }
  }

  /**
   * Execute a streaming query
   */
  async executeStreamingQuery(req: Request, res: Response) {
    const { sessionId, query } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const server = req.app.locals.server as AgentTARSServer;
    if (!server.sessions[sessionId]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    try {
      // Set response headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Get streaming response
      const eventStream = await server.sessions[sessionId].runQueryStreaming(query);

      // Stream events one by one
      for await (const event of eventStream) {
        // Only send data when connection is still open
        if (!res.closed) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } else {
          break;
        }
      }

      // End the stream response
      if (!res.closed) {
        res.end();
      }
    } catch (error) {
      console.error(`Error processing streaming query in session ${sessionId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process streaming query' });
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Failed to process streaming query' })}\n\n`);
        res.end();
      }
    }
  }

  /**
   * Abort a running query
   */
  async abortQuery(req: Request, res: Response) {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const server = req.app.locals.server as AgentTARSServer;
    if (!server.sessions[sessionId]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    try {
      const aborted = await server.sessions[sessionId].abortQuery();
      res.status(200).json({ success: aborted });
    } catch (error) {
      console.error(`Error aborting query in session ${sessionId}:`, error);
      res.status(500).json({ error: 'Failed to abort query' });
    }
  }
}

export const queriesController = new QueriesController();
