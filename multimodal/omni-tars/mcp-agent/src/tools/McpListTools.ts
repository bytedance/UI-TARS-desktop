/*
 * MCP Control Tool Provider - List Tools on Server
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';

export class McpListToolsToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_list_tools',
      description: 'List all tools for a given server. Provide { serverName }.',
      parameters: z.object({
        serverName: z.string().describe('Name of the MCP server to list tools from'),
      }),
      function: async ({ serverName }: { serverName: string }) => {
        const tools = await this.mcpManager.client.listTools(serverName as any);
        return tools;
      },
    });
  }
}
