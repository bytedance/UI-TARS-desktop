/*
 * MCP Control Tool Provider - Cleanup Servers
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';

export class McpCheckServerStatusToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_cleanup_servers',
      description: 'Stop all running MCP servers and cleanup resources.',
      parameters: z.object({}),
      function: async () => {
        await this.mcpManager.client.cleanup();
        return { success: true };
      },
    });
  }
}
