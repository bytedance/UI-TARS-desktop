import { MCPServerName } from '@agent-infra/shared';
import { MCPServer, MCPTool } from '@agent-infra/mcp-client';
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { logger } from '@main/utils/logger';
import { SettingStore } from '@main/store/setting';

export function mcpToolsToAzureTools(
  mcpTools: MCPTool[],
): Array<ChatCompletionTool> {
  return mcpTools.map((tool) => {
    const t = {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    };
    return t;
  });
}

export function mapToolKeysToAzureTools(
  mcpTools: MCPTool[],
  toolKeys: (MCPServerName | string)[],
) {
  return mcpToolsToAzureTools(
    mcpTools.filter((tool) =>
      toolKeys.includes(tool.serverName as MCPServerName),
    ),
  );
}

export function getActiveMcpSettings(): Record<string, MCPServer> {
  try {
    const mcpSettings = SettingStore.get('mcp') || {};
    const builtInServerNames = Object.values(MCPServerName);
    const activeServers = mcpSettings?.mcpServers?.filter(
      (server) =>
        server.status === 'activate' &&
        // filter the built-in MCP servers
        !builtInServerNames.includes(server.name as MCPServerName),
    );

    if (activeServers?.length) {
      return {
        ...activeServers.reduce(
          (acc, server) => ({
            ...acc,
            [server.name]: {
              ...server,
              name: server.name,
              description: server.description || server.name,
            },
          }),
          {},
        ),
      };
    }
    return {};
  } catch (error) {
    logger.error('Error adding MCP servers settings', error);
    return {};
  }
}
