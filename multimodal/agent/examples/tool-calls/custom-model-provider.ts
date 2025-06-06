/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An example of a basic tool call, using custom providers,
 * The first provider will be used at default provider.
 */

import { Agent, Tool, z } from '../../src';

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
  model: {
    providers: [
      {
        name: 'azure-openai',
        baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
        models: ['aws_sdk_claude37_sonnet'],
      },
    ],
  },
  tools: [locationTool, weatherTool],
  toolCallEngine: 'prompt_engineering',
});

async function main() {
  const answer = await agent.run("How's the weather today?");
  console.log(answer);
}

main();
