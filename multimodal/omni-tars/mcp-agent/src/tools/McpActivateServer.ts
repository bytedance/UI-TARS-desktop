/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * MCP Control Tool Provider - Activate Server
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';

export class McpActivateServerToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_activate_server',
      description: 'Activate (start) a configured MCP server by name.',
      parameters: z.object({
        serverName: z.string().describe('Name of the MCP server to activate'),
      }),
      function: async ({ serverName }: { serverName: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const server = await this.mcpManager.client.getServer(serverName as any);
        if (!server) throw new Error(`Server ${serverName} not found`);
        await this.mcpManager.client.activate(server as any);
        return { success: true, serverName };
      },
    });
  }
}
