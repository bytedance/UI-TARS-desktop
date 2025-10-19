/*
 * MCP Control Tool Provider - Call Tool
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';

export class McpCallToolToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_call_tool',
      description:
        'Call an arbitrary tool on a given MCP server. Provide { serverName, toolName, args }.',
      parameters: z.object({
        serverName: z.string(),
        toolName: z.string(),
        args: z.any().optional(),
      }),
      function: async ({
        serverName,
        toolName,
        args,
      }: {
        serverName: string;
        toolName: string;
        args?: any;
      }) => {
        const result = await this.mcpManager.client.callTool({
          client: serverName as any,
          name: toolName,
          args: args ?? {},
        });
        return result;
      },
    });
  }
}
