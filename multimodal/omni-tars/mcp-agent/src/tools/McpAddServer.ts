/*
 * MCP Control Tool Provider - Add Server
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';
import type { MCPServer } from '@agent-infra/mcp-client';

export class McpAddServerToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_add_server',
      description: 'Add a new MCP server configuration and optionally activate it.',
      parameters: z.object({
        server: z.any().describe('MCPServer configuration object'),
      }),
      function: async ({ server }: { server: MCPServer }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.mcpManager.client.addServer(server as any);
        return { success: true, server: server.name };
      },
    });
  }
}
