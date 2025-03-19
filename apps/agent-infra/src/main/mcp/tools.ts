import { MCPServerName } from '@agent-infra/shared';
import { MCPTool } from '@agent-infra/mcp-client';
import { ChatCompletionTool } from 'openai/resources/index.mjs';

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
  toolKeys: MCPServerName[],
) {
  return mcpToolsToAzureTools(
    mcpTools.filter((tool) =>
      toolKeys.includes(tool.serverName as MCPServerName),
    ),
  );
}
