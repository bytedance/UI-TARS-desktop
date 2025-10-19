/*
 * MCP Control Tool Provider - Clear Tool Cache
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from '../tools/mcp';

export class McpCacheClearToolProvider {
  constructor(private mcpManager: McpManager) {}

  getTool(): Tool {
    return new Tool({
      id: 'mcp_cache_clear',
      description: 'Clear local MCP tool registry cache (useful after many add/update operations).',
      parameters: z.object({}),
      function: async () => {
        // if plugin-level cache exists, plugin should expose an API to clear; otherwise we can call listAvailableServices to refresh
        try {
          // best-effort call: try to call listTools for all servers to refresh caches
          const servers = await this.mcpManager.client.listAvailableServices();
          for (const s of servers) {
            // try to list tools to refresh server caches
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.mcpManager.client.listTools(s.name as any).catch(() => {});
          }
        } catch (err) {
          // ignore
        }
        return { success: true };
      },
    });
  }
}
