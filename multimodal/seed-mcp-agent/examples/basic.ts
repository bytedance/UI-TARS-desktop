import { LogLevel } from 'agent-interface/dist';
import { SeedMcpAgent } from '../src/index';

async function main() {
  const agent = new SeedMcpAgent({
    model: {
      baseURL: 'https://ark-cn-beijing.bytedance.net/api/v3',
      apiKey: '2f16f6ae-d2c4-49c8-b208-11607f1aac63',
      id: 'ep-20250627155918-4jmhg',
    },
    tavilyApiKey: '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',
    searchApiKey: 'b1d7b3be348217cdbd12bc1ffac174f515cdedf2',
    logLevel: LogLevel.INFO,
  });

  agent._setIsReplay();

  const ans = await agent.run('北京天气如何？');

  console.log('ans: ', ans);
}

main();
