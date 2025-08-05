import SeedMcpAgent from '../src/index';
import { LogLevel } from '@tarko/agent';
import { Questions } from './question';

async function main() {
  const agent = new SeedMcpAgent({
    model: {
      baseURL: process.env.ARK_TEST_URL,
      apiKey: process.env.ARK_TEST_KEY,
      id: 'ep-20250627155918-4jmhg',
    },
    tavilyApiKey: process.env.TAVILY_API_KEY!,
    googleApiKey: process.env.GOOGLE_API_KEY!,
    logLevel: LogLevel.INFO,
  });

  const ans = await agent.run(Questions.Weather);

  console.log('ans: ', ans);
}

main();
