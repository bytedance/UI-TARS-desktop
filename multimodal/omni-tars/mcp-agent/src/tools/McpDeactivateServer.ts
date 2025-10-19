/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * MCP Control Tool Provider - Deactivate Server
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';

export class McpDeactivateServerToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_deactivate_server',
      description: 'Deactivate (stop) a running MCP server by name.',
      parameters: z.object({
        serverName: z.string().describe('Name of the MCP server to deactivate'),
      }),
      function: async ({ serverName }: { serverName: string }) => {
        await this.mcpManager.client.deactivate(serverName as any);
        return { success: true, serverName };
      },
    });
  }
}
