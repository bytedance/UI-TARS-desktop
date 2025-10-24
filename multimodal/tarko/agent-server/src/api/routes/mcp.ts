import express from 'express';
import * as mcpController from '../controllers/mcp';

export function registerMcpRoutes(app: express.Application): void {
  // Base path: /mcp
  app.get('/mcp/servers', mcpController.listServers);
  app.post('/mcp/servers/add', mcpController.addServer);
  app.put('/mcp/servers/:name', mcpController.updateServer);
  app.delete('/mcp/servers/:name', mcpController.deleteServer);

  app.post('/mcp/servers/:name/activate', mcpController.setServerActive);
  app.get('/mcp/servers/:name/status', mcpController.getServerStatus);
  app.get('/mcp/servers/:name/tools', mcpController.getServerTools);

  // Tool call (supports stream flag in body)
  app.post('/mcp/servers/:name/tools/:toolId/call', mcpController.callTool);

  // Cleanup endpoint
  app.post('/mcp/cleanup', mcpController.cleanup);
}
