import { SeedMcpAgent } from '../src/index';
import { LogLevel } from '@multimodal/agent';

async function main() {
  const agent = new SeedMcpAgent({
    model: {
      provider: 'azure-openai',
      id: 'aws_sdk_claude4_sonnet',
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL:
        'https://gpt-i18n.byteintl.net/gpt/openapi/online/v2/crawl/openai/deployments/gpt_openapi',
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
