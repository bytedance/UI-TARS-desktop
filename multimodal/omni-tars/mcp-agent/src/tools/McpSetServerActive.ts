/*
 * MCP Control Tool Provider - Set Server Active (toggle)
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';

export class McpSetServerActiveToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_set_server_active',
      description: 'Set server active state (true to activate, false to deactivate).',
      parameters: z.object({
        serverName: z.string(),
        isActive: z.boolean(),
      }),
      function: async ({ serverName, isActive }: { serverName: string; isActive: boolean }) => {
        await this.mcpManager.client.setServerActive({ name: serverName as any, isActive });
        return { success: true, serverName, isActive };
      },
    });
  }
}
