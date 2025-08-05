import { Tool, z } from '@tarko/agent';
import { McpManager } from './mcp';

export class ShellToolProvider {
  private mcpManager: McpManager;

  constructor(mcpManager: McpManager) {
    this.mcpManager = mcpManager;
  }

  getTool(): Tool {
    return new Tool({
      id: 'execute_bash',
      description: '',
      parameters: z.object({
        command: z.string().describe('The bash command to execute.'),
      }),
      function: async ({ command }) => {
        return this.mcpManager.client.callTool({
          client: McpManager.McpClientType.ShellCI,
          name: 'run_code',
          args: {
            code: command,
          },
        });
      },
    });
  }
}
