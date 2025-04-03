import {
  Agent,
  Tool,
  Model,
  OpenAI,
  OpenAIToolCallProvider,
  InstructionToolCallProvider,
} from '../src';
import { z } from 'zod';
import { getModel } from './model';

const model = getModel('qwen2.5-7b-instruct-1m');
// Create tool call provider explicitly
const toolCallProvider = new OpenAIToolCallProvider();

const locationTool = new Tool({
  id: 'getCurrentLocation',
  description: "Get user's current location",
  parameters: z.object({}),
  function: async () => {
    return { location: 'Boston' };
  },
});

const weatherTool = new Tool({
  id: 'getWeather',
  description: 'Get weather information for a specified location',
  parameters: z.object({
    location: z.string().describe('Location name, such as city name'),
  }),
  function: async (input) => {
    const { location } = input;
    return {
      location,
      temperature: '70°F (21°C)',
      condition: 'Sunny',
      precipitation: '10%',
      humidity: '45%',
      wind: '5 mph',
    };
  },
});

const agent = new Agent({
  model,
  name: 'Manus',
  instructions: `You are Manus, a general AI agent that is good at understanding user needs and helping people solve problems.`,
  tools: [locationTool, weatherTool],
  toolCallProvider, // Pass the provider explicitly
  maxIterations: 3,
});

async function main() {
  const queries = ["How's the weather today?"];

  for (const query of queries) {
    console.log('\n==================================================');
    console.log(`👤 User query: ${query}`);
    console.log('==================================================');

    const answer = await agent.run(query);

    console.log('--------------------------------------------------');
    console.log(`🤖 Assistant response: ${answer}`);
    console.log('==================================================\n');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
