import { SeedMcpAgent } from '../src/index';
import { LogLevel } from '@multimodal/agent';

async function main() {
  const agent = new SeedMcpAgent({
    model: {
      baseURL: 'https://ark-cn-beijing.bytedance.net/api/v3',
      apiKey: process.env.ARK_TEST_KEY,
      id: 'ep-20250627155918-4jmhg',
    },
    tavilyApiKey: process.env.TavilyApiKey,
    serperApiKey: process.env.SerperApiKey,
    logLevel: LogLevel.INFO,
  });

  agent._setIsReplay();

  const ans = await agent.run('北京天气如何？');

  console.log('ans: ', ans);
}

main();
