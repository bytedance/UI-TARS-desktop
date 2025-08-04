import { Agent, AgentRunNonStreamingOptions } from '../../src';
import { SimpleKorToolCallEngine } from './simple-pe-tool-call-engine';
import { SearchTool } from './tools/web-search';

export const agent = new Agent({
  name: 'Deep Search Agent',
  instructions: `You are a helpful assistant that can search the web for information.
When users ask questions that require current information or research, use the web search tool to find relevant information.
Always provide helpful and accurate responses based on the search results.`,

  tools: [SearchTool],

  toolCallEngine: SimpleKorToolCallEngine,

  model: {
    provider: 'volcengine',
    id: 'ep-20250510145437-5sxhs',
    apiKey: process.env.ARK_API_KEY,
  },

  maxIterations: 10,
});

export const runOptions: AgentRunNonStreamingOptions = {
  input: 'What is Agent TARS?',
};

async function main() {
  const response = await agent.run(runOptions);
  console.log('\n📝 Agent Response:');
  console.log('================================================');
  console.log(response.content);
  console.log('================================================');
}

if (require.main === module) {
  main().catch(console.error);
}
