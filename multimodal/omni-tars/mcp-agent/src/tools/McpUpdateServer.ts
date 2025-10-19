/*
 * MCP Control Tool Provider - Update Server
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';
import type { MCPServer } from '@agent-infra/mcp-client';

export class McpUpdateServerToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_update_server',
      description: 'Update an existing MCP server configuration.',
      parameters: z.object({
        server: z.any().describe('Updated MCPServer object'),
      }),
      function: async ({ server }: { server: MCPServer }) => {
        await this.mcpManager.client.updateServer(server as any);
        return { success: true, server: server.name };
      },
    });
  }
}
