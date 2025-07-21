import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

async function createServer(): Promise<McpServer> {
  const server = new McpServer({
    name: '{{name}}',
    version: process.env.VERSION || '0.0.1',
  });

  // === Tools ===
  server.registerTool(
    'test_tool',
    {
      description: 'Test tool',
      inputSchema: {
        hello: z.string().describe('Hello'),
      },
    },
    async (args) => {
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: 'Hello, ' + args.hello,
          },
        ],
      };
    },
  );

  return server;
}

export { createServer };
