import { Request, Response } from 'express';

/**
 * Lightweight MCP controller that proxies requests to a McpManager attached
 * to `app.locals.mcpManager`.
 */
function getMcpManager(req: Request) {
  return (req.app.locals as any).mcpManager;
}

export async function listServers(req: Request, res: Response) {
  try {
    const mgr = getMcpManager(req);
    if (!mgr) return res.status(500).json({ error: 'MCP manager not initialized' });
    const servers = await mgr.listServers();
    res.status(200).json({ servers });
  } catch (error) {
    console.error('Error listing MCP servers:', error);
    res.status(500).json({ error: 'Failed to list servers' });
  }
}

export async function addServer(req: Request, res: Response) {
  try {
    const mgr = getMcpManager(req);
    if (!mgr) return res.status(500).json({ error: 'MCP manager not initialized' });
    const server = req.body?.server || req.body;
    const added = await mgr.addServer(server);
    res.status(201).json({ data: { server: added } });
  } catch (error) {
    console.error('Error adding MCP server:', error);
    res.status(500).json({ error: 'Failed to add server' });
  }
}

export async function updateServer(req: Request, res: Response) {
  try {
    const mgr = getMcpManager(req);
    if (!mgr) return res.status(500).json({ error: 'MCP manager not initialized' });
    const server = req.body?.server || req.body;
    await mgr.updateServer(server);
    res.status(200).json({ data: { server } });
  } catch (error) {
    console.error('Error updating MCP server:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
}

export async function deleteServer(req: Request, res: Response) {
  try {
    const mgr = getMcpManager(req);
    if (!mgr) return res.status(500).json({ error: 'MCP manager not initialized' });
    const name = req.params.name;
    await mgr.deleteServer(name);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
}

export async function setServerActive(req: Request, res: Response) {
  try {
    const mgr = getMcpManager(req);
    if (!mgr) return res.status(500).json({ error: 'MCP manager not initialized' });
    const name = req.params.name;
    const { activate } = req.body;
    const isActive = !!activate;
    const status = await mgr.setServerActive(name, isActive);
    res.status(200).json({ data: status });
  } catch (error) {
    console.error('Error setting server active:', error);
    res.status(500).json({ error: 'Failed to set server active state' });
  }
}

export async function getServerStatus(req: Request, res: Response) {
  try {
    const mgr = getMcpManager(req);
    if (!mgr) return res.status(500).json({ error: 'MCP manager not initialized' });
    const name = req.params.name;
    const status = await mgr.getServerStatus(name);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting server status:', error);
    res.status(500).json({ error: 'Failed to get server status' });
  }
}

export async function getServerTools(req: Request, res: Response) {
  try {
    const mgr = getMcpManager(req);
    if (!mgr) return res.status(500).json({ error: 'MCP manager not initialized' });
    const name = req.params.name;
    const tools = await mgr.listTools(name);
    res.status(200).json({ tools });
  } catch (error) {
    console.error('Error getting server tools:', error);
    res.status(500).json({ error: 'Failed to get tools' });
  }
}

// Tool call - supports stream flag
export async function callTool(req: Request, res: Response) {
  try {
    const mgr = getMcpManager(req);
    if (!mgr) return res.status(500).json({ error: 'MCP manager not initialized' });
    const name = req.params.name;
    const toolId = req.params.toolId;
    const { args, stream } = req.body || {};

    if (stream) {
      // Setup SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Write initial event
      res.write(`data: ${JSON.stringify({ type: 'started', timestamp: Date.now() })}\n\n`);

      // Try to stream events from manager; fallback to simple done event
      try {
        const streamIter = await mgr.callToolStreaming(name, toolId, args);

        if (streamIter && typeof streamIter[Symbol.asyncIterator] === 'function') {
          for await (const event of streamIter) {
            if (res.writableEnded) break;
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        } else {
          // If manager didn't return an iterator, call non-streaming and send done
          const result = await mgr.callTool(name, toolId, args);
          res.write(`data: ${JSON.stringify({ type: 'done', data: result })}\n\n`);
        }
      } catch (err) {
        console.error('Error during streaming tool call:', err);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : String(err) })}\n\n`);
        }
      }

      if (!res.writableEnded) res.end();
      return;
    }

    // Non-streaming
    const result = await mgr.callTool(name, toolId, args);
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error calling tool:', error);
    res.status(500).json({ error: 'Failed to call tool' });
  }
}

export async function cleanup(req: Request, res: Response) {
  try {
    const mgr = getMcpManager(req);
    if (!mgr) return res.status(500).json({ error: 'MCP manager not initialized' });
    await mgr.cleanup();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error during MCP cleanup:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
}
