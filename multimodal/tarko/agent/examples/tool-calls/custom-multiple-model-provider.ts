/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An example of a basic tool call, using multiple custom providers,
 * You can switch the model provider in
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
    location: z.string().describe('location name'),
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
      {
        name: 'openai',
        baseURL: process.env.OPENAI_API_BASE_URL,
        models: ['gpt-4o-2024-11-20'],
      },
      {
        name: 'lm-studio',
        models: ['qwen3-1.7b'],
      },
    ],
  },
  tools: [locationTool, weatherTool],
  thinking: {
    type: 'disabled',
  },
  toolCallEngine: 'prompt_engineering',
});

async function main() {
  const answer1 = await agent.run({
    input: "How's the weather today?",
    model: 'aws_sdk_claude37_sonnet',
  });

  console.log('answer from "aws_sdk_claude37_sonnet":', answer1);

  const answer2 = await agent.run({
    input: "How's the weather today?",
    model: 'gpt-4o-2024-11-20',
  });

  console.log('answer from "gpt-4o-2024-11-20":', answer2);

  const answer3 = await agent.run({
    input: "How's the weather today?",
    model: 'qwen3-1.7b',
  });

  console.log('answer from "qwen3-1.7b":', answer3);
}

main();
