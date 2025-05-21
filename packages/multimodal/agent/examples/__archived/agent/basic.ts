/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Agent, Tool, z } from '../../../src';
import { TEST_MODEL_PROVIDERS } from '../../../src/_config';

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
  name: 'Agent TARS',
  tools: [locationTool, weatherTool],
  instructions: `
  You are a tool call agent, you MUST SELECT a TOOL to handle user's request.
  
  1. DO NOT make any fake informations
  2. "finish_reason" should always be "tool_calls"
  `,
  maxIterations: 10,
  model: {
    providers: TEST_MODEL_PROVIDERS,
    use: {
      provider: 'azure-openai',
      model: 'aws_sdk_claude37_sonnet',
    },
  },
  /**
   * If you use some scenes that seem to be OpenAI Compatibility,
   * or encapsulate too many layers so that the native tool calls are unavailable,
   * you can switch toolCallEngine to "prompt_engineering"
   */
  toolCallEngine: 'prompt_engineering',
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
