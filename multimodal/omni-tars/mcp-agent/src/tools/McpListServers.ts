/*
 * MCP Control Tool Provider - List Servers
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';

export class McpListServersToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_list_servers',
      description: 'List all configured MCP servers (name, type, status).',
      parameters: z.object({}),
      function: async () => {
        const svcs = await this.mcpManager.client.listAvailableServices();
        return svcs;
      },
    });
  }
}
