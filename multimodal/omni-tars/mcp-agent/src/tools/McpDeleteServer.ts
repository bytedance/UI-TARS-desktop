/*
 * MCP Control Tool Provider - Delete Server
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';

export class McpDeleteServerToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_delete_server',
      description: 'Delete an MCP server from configuration and stop it if running.',
      parameters: z.object({
        serverName: z.string().describe('Name of the MCP server to delete'),
      }),
      function: async ({ serverName }: { serverName: string }) => {
        await this.mcpManager.client.deleteServer(serverName as any);
        return { success: true, serverName };
      },
    });
  }
}
