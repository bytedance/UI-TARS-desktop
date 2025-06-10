import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

function createServer(): McpServer {
  const server = new McpServer({
    name: '{{name}}',
    version: process.env.VERSION || '0.0.1',
  });

  // === Tools ===
  server.tool(
    'test_tool',
    'Test tool',
    {
      hello: z.string().describe('Hello'),
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
