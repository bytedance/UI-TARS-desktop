import { MCPClient } from '@agent-infra/mcp-client';

async function main() {
  const mcpClient = new MCPClient([
    {
      type: 'streamable-http',
      name: 'FileSystem-http',
      description: 'filesystem tool',
      url: 'https://7nn045cw.fn.bytedance.net/mcp',
      headers: {
        'x-serper-api-key': 'b1d7b3be348217cdbd12bc1ffac174f515cdedf2',
      },
    },
  ]);

  await mcpClient.init();

  const tools = await mcpClient.listTools();

  const res = await mcpClient.callTool({
    client: 'FileSystem-http',
    name: 'google_search',
    args: {
      q: '北京当前天气',
    },
  });

  console.log(res);
}

main();
