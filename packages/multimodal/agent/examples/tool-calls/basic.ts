/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An example of a basic tool call, using `zod` to describe the
 * tool parameters, defaults to OpenAI provider.
 */

import { Agent, AgentRunNonStreamingOptions, LogLevel, Tool, z } from '../../src';

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

export const agent = new Agent({
  model: {
    use: {
      provider: 'volcengine',
      model: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
      apiKey: process.env.ARK_API_KEY,
    },
  },
  tools: [locationTool, weatherTool],
  logLevel: LogLevel.DEBUG,
});

export const runOptions: AgentRunNonStreamingOptions = {
  input: "How's the weather today?",
};

async function main() {
  const answer = await agent.run(runOptions);
  console.log(answer);
}

if (require.main === module) {
  main();
}
